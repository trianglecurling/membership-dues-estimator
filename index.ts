import "./styles.scss";

type DiscountType = "family" | "student" | "reciprocal" | "winterOnly";
type DiscountStrategy = "absolute" | "percentage";
type ItemType =
  | "membership"
  | "firstLeague"
  | "secondLeague"
  | "thirdLeague"
  | "additionalLeague"
  | "basicIce"
  | "basicIceReduced"
  | "social";

interface Sku {
  name: string;
  cost: number;
}

interface Discount {
  name: string;
  discountStrategy: DiscountStrategy;
  discountAmount: number;
}

const items: Record<ItemType, Sku> = {
  membership: {
    name: "2022-2023 annual base membership",
    cost: 135
  },
  firstLeague: {
    name: "First league",
    cost: 155
  },
  secondLeague: {
    name: "Second league",
    cost: 155
  },
  thirdLeague: {
    name: "Third league",
    cost: 155
  },
  additionalLeague: {
    name: "Additional league",
    cost: 55
  },
  basicIce: {
    name: "Basic ice privileges (unlimited sparing and daytime leagues)",
    cost: 115
  },
  basicIceReduced: {
    name: "Basic ice privileges (unlimited sparing and daytime leagues)",
    cost: 55
  },
  social: {
    name: "Social membership (no dues)",
    cost: 50
  }
};

const discounts: Record<DiscountType, Discount> = {
  family: {
    name: "Family discount",
    discountStrategy: "percentage",
    discountAmount: 5
  },
  student: {
    name: "Student discount",
    discountStrategy: "percentage",
    discountAmount: 30
  },
  reciprocal: {
    name: "Reciprocal member discount",
    discountStrategy: "absolute",
    discountAmount: 75
  },
  winterOnly: {
    name: "Winter-only discount",
    discountStrategy: "absolute",
    discountAmount: 35
  }
};

const benefits = {
  roster: "Inclusion on the official Triangle Curling Club roster of members",
  nameTag: "Name tag (for new members only)",
  social: "Access to Triangle Curling membership online social groups",
  agm:
    "Attendance to the Annual General Meeting and end-of-season celebration and board meetings",
  bartending: "Ability to volunteer as a bartender",
  dues:
    "Dues paid on your behalf to USA Curling, GNCC, and USWCA (as applicable)",
  voting:
    "Voting in elections to select board members, bylaws changes, and more (members 18+ only)",
  buildingAccess: "Building access (door and security codes)",
  ice: "Unlimited practice when ice is available",
  daytime:
    "Participate in Tuesday and Wednesday Daytime Leagues at no extra cost",
  sparing: "Unlimited sparing",
  training: "Ability to register for clinics run by the Training Committee",
  rentals: "Discounted rates on private rentals",
  clubSpiel:
    "Ability to participate in the Triangle Club Bonspiel (usually in March/April)",
  leagues: "Participate in <NUM> <PLURAL_LEAGUE>",
  none: "Adjust your selection above to see benefits"
};

function getBenefits(
  fallCart: Cart,
  winterCart: Cart
): {
  fall: (keyof typeof benefits)[];
  winter: (keyof typeof benefits)[];
  annual: (keyof typeof benefits)[];
} {
  const fall: (keyof typeof benefits)[] = [];
  const winter: (keyof typeof benefits)[] = [];
  const annual: (keyof typeof benefits)[] = [];

  const fallSocial = fallCart.hasItem("social");
  const winterSocial = winterCart.hasItem("social");
  const fallMembership = fallCart.hasItem("membership");
  const winterMembership = winterCart.hasItem("membership");
  const fallLeagues = fallCart.getLeagueCount();
  const winterLeagues = winterCart.getLeagueCount();
  const fallIce = fallCart.hasItem("basicIce") || fallLeagues > 0;
  const winterIce = winterCart.hasItem("basicIce") || winterLeagues > 0;

  if (fallSocial || winterSocial || fallMembership || winterMembership) {
    annual.push("roster");
    annual.push("social");
    annual.push("agm");
    annual.push("bartending");
  }

  if (fallMembership || winterMembership) {
    // No dues for reciprocal members
    if (
      !fallCart
        .getDiscounts()
        .some((d) => d.name === "Reciprocal member discount") &&
      !winterCart
        .getDiscounts()
        .some((d) => d.name === "Reciprocal member discount")
    ) {
      annual.push("dues");
    }
    annual.push("voting");
  }

  if (fallIce || winterIce) {
    annual.push("clubSpiel");
  }

  if (fallCart.getTotal() === 0 && winterCart.getTotal() === 0) {
    annual.push("none");
  }

  if (fallIce) {
    fall.push("buildingAccess");
    fall.push("ice");
    fall.push("daytime");
    fall.push("sparing");
    fall.push("rentals");
    fall.push("training");
  }

  if (winterIce) {
    winter.push("buildingAccess");
    winter.push("ice");
    winter.push("daytime");
    winter.push("sparing");
    winter.push("rentals");
    winter.push("training");
  }

  if (fallLeagues > 0) {
    fall.push(`leagues`);
  }

  if (winterLeagues > 0) {
    winter.push(`leagues`);
  }

  return { fall, winter, annual };
}

Object.freeze(items);
Object.freeze(discounts);
Object.freeze(benefits);

const discountTypeSortValues: Record<DiscountStrategy, number> = {
  absolute: 1,
  percentage: 2
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});
function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

class Cart {
  private cartItems: Sku[] = [];
  private cartDiscounts: Discount[] = [];

  public addItem(name: ItemType) {
    this.cartItems.push(items[name]);
  }
  public addDiscount(name: DiscountType) {
    this.cartDiscounts.push(discounts[name]);

    // Do the dollar-amount ("absolute") discounts before percentage discounts
    this.cartDiscounts.sort(
      (a, b) =>
        discountTypeSortValues[a.discountStrategy] -
        discountTypeSortValues[b.discountStrategy]
    );
  }
  public hasItem(name: ItemType) {
    return (
      this.cartItems.find((i) => i.name === items[name].name) !== undefined
    );
  }
  public getLeagueCount() {
    return this.cartItems.filter(
      (i) => i.name.includes("league") && !i.name.includes("daytime")
    ).length;
  }
  public getTotal() {
    const itemTotal = this.cartItems.reduce((p, c) => c.cost + p, 0);
    let grandTotal = itemTotal;
    for (const discount of this.cartDiscounts) {
      if (discount.discountStrategy === "absolute") {
        grandTotal -= discount.discountAmount;
      } else {
        grandTotal *= 1 - discount.discountAmount / 100;
      }
    }
    return grandTotal;
  }
  public getItems(): typeof this.cartItems {
    return JSON.parse(JSON.stringify(this.cartItems));
  }
  public getDiscounts(): typeof this.cartDiscounts {
    return JSON.parse(JSON.stringify(this.cartDiscounts));
  }
  public asJSON() {
    return {
      items: this.getItems(),
      discounts: this.getDiscounts()
    };
  }
}

type SocialType = "dues" | "noDues";

interface GetCostParams {
  fallRegularLeagues: number;
  fallDayLeagues: boolean;
  fallSpareOnly: boolean;
  fallSocial?: SocialType;
  winterRegularLeagues: number;
  winterDayLeagues: boolean;
  winterSpareOnly: boolean;
  winterSocial?: SocialType;
  discount?: Exclude<DiscountType, "winterOnly">;
}

function getCarts(params: GetCostParams): { fall: Cart; winter: Cart } {
  const leagueOrder: ItemType[] = [
    "firstLeague",
    "secondLeague",
    "thirdLeague"
  ];
  const fallCart = new Cart();
  const winterCart = new Cart();

  // == Fall ==
  // Add the base membership
  if (
    params.fallDayLeagues ||
    params.fallSpareOnly ||
    params.fallRegularLeagues > 0 ||
    params.fallSocial === "dues"
  ) {
    fallCart.addItem("membership");
  }

  // Add regular leagues
  for (let i = 0; i < params.fallRegularLeagues; ++i) {
    fallCart.addItem(leagueOrder.shift() ?? "additionalLeague");
  }

  // Add basic ice or social
  if (params.fallRegularLeagues === 0) {
    if (params.fallDayLeagues || params.fallSpareOnly) {
      fallCart.addItem("basicIce");
    } else if (params.fallSocial === "noDues") {
      fallCart.addItem("social");
    }
  }

  // Discounts
  if (fallCart.getItems().length > 0 && fallCart.hasItem("membership")) {
    if (params.discount === "reciprocal" && fallCart.getLeagueCount() > 0) {
      fallCart.addDiscount("reciprocal");
    }
    if (params.discount === "family") {
      fallCart.addDiscount("family");
    } else if (params.discount === "student") {
      fallCart.addDiscount("student");
    }
  }

  // == Winter ==
  // Add the base membership
  if (!fallCart.hasItem("membership")) {
    if (
      params.winterDayLeagues ||
      params.winterSpareOnly ||
      params.winterRegularLeagues > 0 ||
      params.winterSocial === "dues"
    ) {
      winterCart.addItem("membership");
      winterCart.addDiscount("winterOnly");
    }
  }

  // Add regular leagues
  for (let i = 0; i < params.winterRegularLeagues; ++i) {
    winterCart.addItem(leagueOrder.shift() ?? "additionalLeague");
  }

  // Add basic ice or social
  if (params.winterRegularLeagues === 0) {
    if (params.winterDayLeagues || params.winterSpareOnly) {
      if (fallCart.getLeagueCount() >= 3) {
        winterCart.addItem("basicIceReduced");
      } else {
        winterCart.addItem("basicIce");
      }
    } else if (
      params.winterSocial === "noDues" &&
      !fallCart.hasItem("social") &&
      !fallCart.hasItem("membership")
    ) {
      winterCart.addItem("social");
    }
  }

  // Discounts
  if (winterCart.getItems().length > 0) {
    if (
      params.discount === "reciprocal" &&
      winterCart.hasItem("membership") &&
      !fallCart.hasItem("membership") &&
      winterCart.getLeagueCount() > 0
    ) {
      winterCart.addDiscount("reciprocal");
    }
    if (params.discount === "family") {
      winterCart.addDiscount("family");
    } else if (params.discount === "student") {
      winterCart.addDiscount("student");
    }
  }

  return { fall: fallCart, winter: winterCart };
}

function sliderButton(
  choices: string[],
  defaultSelected: string | undefined,
  unselectable: boolean,
  onChange: (button: string) => void
) {
  const container = document.createElement("div");
  container.classList.add("slider-button");
  for (const choice of choices) {
    if (choice === "|") {
      const divider = document.createElement("span");
      divider.classList.add("divider");
      container.append(divider);
      continue;
    }
    const button = document.createElement("button");
    button.addEventListener("click", (event) => {
      if (event.target instanceof HTMLButtonElement) {
        const wasSelected = event.target.classList.contains("selected");
        for (const button of container.querySelectorAll("button")) {
          button.classList.remove("selected");
          button.classList.remove("implied");
        }
        if (wasSelected && unselectable) {
          event.target.classList.remove("selected");
        } else {
          event.target.classList.add("selected");
          if (!wasSelected) {
            onChange(event.target.innerText);
          }
          const dayLeagueButton = Array.from(
            event.target.parentElement?.querySelectorAll("button") ?? []
          ).find((b) => b.innerText === "Day leagues & sparing");
          if (dayLeagueButton) {
            dayLeagueButton.classList.add("implied");
          }
        }
      }
    });
    button.innerText = choice;
    if (choice === "None") {
      button.classList.add("selected-when-disabled");
    }
    if (defaultSelected === choice) {
      button.classList.add("selected");
    }
    container.append(button);
  }

  return container;
}

const app = document.getElementById("app");
const fallMembership = document.getElementById("fallMembership");
const fallIce = document.getElementById("fallIce");
const winterMembership = document.getElementById("winterMembership");
const winterIce = document.getElementById("winterIce");
const discount = document.getElementById("discount");
const estimatedDues = document.getElementById("estimatedDuesBox");
const benefitsBox = document.getElementById("benefitsBox");
const getCostParams: GetCostParams = {
  fallRegularLeagues: 0,
  fallDayLeagues: false,
  fallSpareOnly: false,
  winterRegularLeagues: 0,
  winterDayLeagues: false,
  winterSpareOnly: false
};

function setCarts(getCostParams: GetCostParams) {
  const { fall, winter } = getCarts(getCostParams);
  const {
    fall: fallBenefitsData,
    winter: winterBenefitsData,
    annual: annualBenefitsData
  } = getBenefits(fall, winter);

  // Dues section
  const fallDues = document.createElement("div");
  fallDues.classList.add("dues-box");
  const fallDuesHeading = document.createElement("h3");
  fallDuesHeading.innerText = "Fall";
  fallDues.append(fallDuesHeading);
  const winterDues = document.createElement("div");
  const winterDuesHeading = document.createElement("h3");
  winterDuesHeading.innerText = "Winter";
  winterDues.append(winterDuesHeading);
  winterDues.classList.add("dues-box");
  const fallItems = fall.getItems();
  const fallDiscounts = fall.getDiscounts();
  const winterItems = winter.getItems();
  const winterDiscounts = winter.getDiscounts();

  const fallTotal = fall.getTotal();
  const winterTotal = winter.getTotal();
  const grandTotal = fallTotal + winterTotal;

  for (const item of fallItems) {
    const itemBox = document.createElement("div");
    const itemName = document.createElement("div");
    itemName.classList.add("item-name");
    const itemCost = document.createElement("div");
    itemBox.append(itemName, itemCost);
    itemName.append(item.name);
    itemCost.append(formatCurrency(item.cost));
    fallDues.append(itemBox);
  }

  for (const discount of fallDiscounts) {
    const itemBox = document.createElement("div");
    const itemName = document.createElement("div");
    itemName.classList.add("item-name");
    const itemCost = document.createElement("div");
    itemBox.append(itemName, itemCost);
    itemName.append(discount.name);
    itemCost.append(
      `-${discount.discountStrategy === "absolute" ? "$" : ""}${
        discount.discountAmount
      }${discount.discountStrategy === "percentage" ? "%" : ""}`
    );
    fallDues.append(itemBox);
  }
  const fallTotalBox = document.createElement("div");
  const fallTotalName = document.createElement("div");
  fallTotalName.classList.add("amount", "item-name");
  const fallTotalCost = document.createElement("div");
  fallTotalCost.classList.add("amount");
  fallTotalBox.append(fallTotalName, fallTotalCost);
  fallTotalName.append("Fall total");
  fallTotalCost.append(formatCurrency(fallTotal));
  fallDues.append(fallTotalBox);

  for (const item of winterItems) {
    const itemBox = document.createElement("div");
    const itemName = document.createElement("div");
    itemName.classList.add("item-name");
    const itemCost = document.createElement("div");
    itemBox.append(itemName, itemCost);
    itemName.append(item.name);
    itemCost.append(formatCurrency(item.cost));
    winterDues.append(itemBox);
  }

  for (const discount of winterDiscounts) {
    const itemBox = document.createElement("div");
    const itemName = document.createElement("div");
    itemName.classList.add("item-name");
    const itemCost = document.createElement("div");
    itemBox.append(itemName, itemCost);
    itemName.append(discount.name);
    itemCost.append(
      `-${discount.discountStrategy === "absolute" ? "$" : ""}${
        discount.discountAmount
      }${discount.discountStrategy === "percentage" ? "%" : ""}`
    );
    winterDues.append(itemBox);
  }
  const winterTotalBox = document.createElement("div");
  const winterTotalName = document.createElement("div");
  winterTotalName.classList.add("amount", "item-name");
  const winterTotalCost = document.createElement("div");
  winterTotalCost.classList.add("amount");
  winterTotalBox.append(winterTotalName, winterTotalCost);
  winterTotalName.append("Winter total");
  winterTotalCost.append(formatCurrency(winterTotal));
  winterDues.append(winterTotalBox);

  const grandTotalBox = document.createElement("div");
  grandTotalBox.classList.add("grand-total-box");
  const grandTotalName = document.createElement("h3");
  const grandTotalCost = document.createElement("div");
  grandTotalBox.append(grandTotalName, grandTotalCost);
  grandTotalName.append("Grand total");
  const grandTotalPrice = document.createElement("span");
  grandTotalPrice.classList.add("price");
  grandTotalPrice.append(formatCurrency(grandTotal));
  const priceText =
    winterTotal > 0 && fallTotal > 0
      ? " - due in two separate payments shown below"
      : winterTotal > 0 || fallTotal > 0
      ? " - due in one payment shown below"
      : "";
  grandTotalCost.append(grandTotalPrice, priceText);

  const estimatedDuesSeasons = document.createElement("div");
  estimatedDuesSeasons.classList.add("estimated-dues-seasons");
  estimatedDuesSeasons.append(fallDues, winterDues);
  estimatedDues?.replaceChildren(grandTotalBox, estimatedDuesSeasons);

  // Benefits section
  const annualBenefitsBox = document.createElement("div");
  annualBenefitsBox.classList.add("annual-benefits-box");
  const fallBenefitsBox = document.createElement("div");
  fallBenefitsBox.classList.add("fall-benefits-box");
  const winterBenefitsBox = document.createElement("div");
  winterBenefitsBox.classList.add("winter-benefits-box");
  const seasonalBenefitsBox = document.createElement("div");
  seasonalBenefitsBox.classList.add("seasonal-benefits");

  const annualBenefits = document.createElement("ul");
  annualBenefitsBox.classList.add("annual-benefits");
  const fallBenefits = document.createElement("ul");
  fallBenefitsBox.classList.add("fall-benefits");
  const winterBenefits = document.createElement("ul");
  winterBenefitsBox.classList.add("winter-benefits");

  const annualBenefitsHeading = document.createElement("h3");
  annualBenefitsHeading.append("Annual benefits (September 1–August 31)");
  const fallBenefitsHeading = document.createElement("h3");
  fallBenefitsHeading.append("Fall benefits (September 1–December 31)");
  const winterBenefitsHeading = document.createElement("h3");
  winterBenefitsHeading.append("Winter benefits (January–May 31)");

  seasonalBenefitsBox.append(fallBenefitsBox, winterBenefitsBox);

  if (annualBenefitsData.length > 0) {
    annualBenefitsBox.append(annualBenefitsHeading, annualBenefits);
    for (const benefit of annualBenefitsData) {
      const item = document.createElement("li");
      item.append(benefits[benefit]);
      annualBenefits.append(item);
    }
  }
  if (fallBenefitsData.length > 0) {
    fallBenefitsBox.append(fallBenefitsHeading, fallBenefits);
    const fallLeagueCount = fall.getLeagueCount();
    for (const benefit of fallBenefitsData) {
      const item = document.createElement("li");
      item.append(
        benefits[benefit]
          .replace("<NUM>", String(fallLeagueCount))
          .replace(
            "<PLURAL_LEAGUE>",
            fallLeagueCount === 1 ? "league" : "leagues"
          )
      );
      fallBenefits.append(item);
    }
  }
  if (winterBenefitsData.length > 0) {
    winterBenefitsBox.append(winterBenefitsHeading, winterBenefits);
    const winterLeagueCount = winter.getLeagueCount();
    for (const benefit of winterBenefitsData) {
      const item = document.createElement("li");
      item.append(
        benefits[benefit]
          .replace("<NUM>", String(winter.getLeagueCount()))
          .replace(
            "<PLURAL_LEAGUE>",
            winterLeagueCount === 1 ? "league" : "leagues"
          )
      );
      winterBenefits.append(item);
    }
  }

  benefitsBox?.replaceChildren(annualBenefitsBox, seasonalBenefitsBox);
}

function getSliderHandler(
  getCostParams: GetCostParams,
  type: "membership" | "ice" | "discount",
  season: "fall" | "winter",
  additionalAction?: (buttonText: string) => void
) {
  return (buttonText: string) => {
    switch (buttonText) {
      case "Social":
        getCostParams[`${season}Social`] = "noDues";
        getCostParams[`${season}SpareOnly`] = false;
        getCostParams[`${season}RegularLeagues`] = 0;
        break;
      case "Social + dues":
        getCostParams[`${season}Social`] = "dues";
        getCostParams[`${season}SpareOnly`] = false;
        getCostParams[`${season}RegularLeagues`] = 0;
        break;
      case "Regular":
        if (season === "fall") {
          for (const e of fallIce?.querySelectorAll(
            "button.selected,button.implied"
          ) ?? []) {
            e.classList.remove("selected", "implied");
          }
        } else if (season === "winter") {
          for (const e of winterIce?.querySelectorAll(
            "button.selected,button.implied"
          ) ?? []) {
            e.classList.remove("selected", "implied");
          }
        }
        break;
      case "Day leagues & sparing":
        getCostParams[`${season}SpareOnly`] = true;
        getCostParams[`${season}RegularLeagues`] = 0;
        break;
      case "1 league":
        getCostParams[`${season}RegularLeagues`] = 1;
        break;
      case "2 leagues":
        getCostParams[`${season}RegularLeagues`] = 2;
        break;
      case "3 leagues":
        getCostParams[`${season}RegularLeagues`] = 3;
        break;
      case "4 leagues":
        getCostParams[`${season}RegularLeagues`] = 4;
        break;
      case "5 leagues":
        getCostParams[`${season}RegularLeagues`] = 5;
        break;
      case "None":
        if (type === "membership") {
          getCostParams[`${season}Social`] = undefined;
          getCostParams[`${season}SpareOnly`] = false;
          getCostParams[`${season}RegularLeagues`] = 0;
        } else if (type === "discount") {
          getCostParams.discount = undefined;
        }
        break;
      case "Family - 5%":
        getCostParams.discount = "family";
        break;
      case "Student - 30%":
        getCostParams.discount = "student";
        break;
      case "Reciprocal - $75":
        getCostParams.discount = "reciprocal";
        break;
    }
    additionalAction?.(buttonText);
    const fallIceSelection = Boolean(fallIce?.querySelector("button.selected"));
    const fallRegular =
      fallMembership?.querySelector<HTMLElement>("button.selected")
        ?.innerText === "Regular";
    const winterIceSelection = Boolean(
      winterIce?.querySelector("button.selected")
    );
    const winterRegular =
      winterMembership?.querySelector<HTMLElement>("button.selected")
        ?.innerText === "Regular";

    if (
      !(
        (fallRegular && !fallIceSelection) ||
        (winterRegular && !winterIceSelection)
      )
    ) {
      setCarts(getCostParams);
    } else {
      if (estimatedDues) {
        estimatedDues.innerHTML =
          "<p><em>Choose from the options above to see your estimated dues.</em></p>";
      }
      if (benefitsBox) {
        benefitsBox.innerHTML =
          "<p><em>Choose from the options above to see your membership benefits.</em></p>";
      }
    }
  };
}
let fallMembershipSlider: HTMLElement,
  fallIceSlider: HTMLElement,
  winterMembershipSlider: HTMLElement,
  winterIceSlider: HTMLElement,
  discountSlider: HTMLElement;

discountSlider = sliderButton(
  ["None", "Family - 5%", "Student - 30%", "Reciprocal - $75"],
  "None",
  false,
  getSliderHandler(getCostParams, "discount", "fall")
);
fallIceSlider = sliderButton(
  [
    "Day leagues & sparing",
    "|",
    "1 league",
    "2 leagues",
    "3 leagues",
    "4 leagues",
    "5 leagues"
  ],
  undefined,
  false,
  getSliderHandler(getCostParams, "ice", "fall")
);
winterIceSlider = sliderButton(
  [
    "Day leagues & sparing",
    "|",
    "1 league",
    "2 leagues",
    "3 leagues",
    "4 leagues",
    "5 leagues"
  ],
  undefined,
  false,
  getSliderHandler(getCostParams, "ice", "winter", () => {
    winterMembershipSlider.setAttribute("data-mode", "manual");
  })
);
fallMembershipSlider = sliderButton(
  ["Regular", "Social", "Social + dues", "None"],
  "Regular",
  false,
  getSliderHandler(getCostParams, "membership", "fall", (buttonText) => {
    if (winterMembershipSlider.getAttribute("data-mode") === "auto") {
      for (const button of winterMembershipSlider.querySelectorAll("button")) {
        if (button.innerText === buttonText) {
          button.click();
          winterMembershipSlider.setAttribute("data-mode", "auto");
        }
      }
    }
    if (buttonText === "Regular") {
      fallIceSlider.classList.remove("disabled");
      discountSlider.classList.remove("disabled");
    } else {
      fallIceSlider.classList.add("disabled");
      if (
        winterMembershipSlider.querySelector<HTMLElement>(".selected")
          ?.innerText !== "Regular"
      ) {
        discountSlider.classList.add("disabled");
      }
    }
  })
);
winterMembershipSlider = sliderButton(
  ["Regular", "Social", "Social + dues", "None"],
  "Regular",
  false,
  getSliderHandler(getCostParams, "membership", "winter", (buttonText) => {
    winterMembershipSlider.setAttribute("data-mode", "manual");
    if (buttonText === "Regular") {
      winterIceSlider.classList.remove("disabled");
      discountSlider.classList.remove("disabled");
    } else {
      winterIceSlider.classList.add("disabled");
      if (
        fallMembershipSlider.querySelector<HTMLElement>(".selected")
          ?.innerText !== "Regular"
      ) {
        discountSlider.classList.add("disabled");
      }
    }
  })
);
winterMembershipSlider.setAttribute("data-mode", "auto");

if (
  app &&
  fallMembership &&
  fallIce &&
  winterMembership &&
  winterIce &&
  discount
) {
  fallMembership.append(fallMembershipSlider);
  fallIce.append(fallIceSlider);
  winterMembership.append(winterMembershipSlider);
  winterIce.append(winterIceSlider);
  discount.append(discountSlider);
}
