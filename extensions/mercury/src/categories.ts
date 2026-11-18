import { Color } from "@raycast/api";
import { Transaction } from "./mercury";

/**
 * Red and green mean money out and money in, and nothing else. Categories that clearly name a
 * direction get them; every other category uses a color that isn't red or green, so a tag never
 * suggests a direction it doesn't have. Matched against Mercury's categories and your own.
 */
// Judged by how the name ends, which is the noun it's about: "Credit Card Payment" is a payment,
// "Payment Processing" is a service, "Deposit Box" is neither money in nor out.
const MONEY_IN =
  /\b(interest earned|income|refunds?|dividends?|deposits?|reimbursements?|payroll|salary|revenue|cash ?back|rebates?)$/i;
const MONEY_OUT = /\b(fees?|tax(es)?|payments?|penalt(y|ies)|interest (charged|paid|expense))$/i;
const NEUTRAL = /\btransfers?$/i;

/** Mercury's automatic categories (the MercuryCategory enum) that don't name a direction, grouped by kind. */
const GROUPS: Array<[Color, string[]]> = [
  [Color.Orange, ["Restaurants", "FoodDelivery", "Grocery", "AlcoholAndBars"]],
  [
    Color.Blue,
    [
      "Airlines",
      "Lodging",
      "CarRental",
      "GroundTransportation",
      "RideshareAndTaxis",
      "Parking",
      "FuelAndGas",
      "OtherTravel",
      "VehicleExpenses",
    ],
  ],
  [
    Color.Purple,
    ["Software", "InternetAndTelephone", "Electronics", "OfficeSupplies", "Shipping", "ProfessionalServices"],
  ],
  [Color.Yellow, ["Utilities", "FacilitiesExpenses", "Insurance", "Legal", "GovernmentServices", "Political"]],
  [
    Color.Magenta,
    [
      "Retail",
      "Clothing",
      "Entertainment",
      "Gambling",
      "Charity",
      "Medical",
      "Education",
      "Advertising",
      "Conferences",
      "Memberships",
      "BooksAndNewspaper",
    ],
  ],
  [Color.SecondaryText, ["Other"]],
];

const COLORS = new Map(GROUPS.flatMap(([color, names]) => names.map((name) => [name, color] as const)));
const PALETTE = [Color.Orange, Color.Blue, Color.Purple, Color.Yellow, Color.Magenta];

export interface Category {
  /** For filtering: Mercury's enum value, or `categoryId:<id>` for a category you created. */
  key: string;
  label: string;
  color: Color;
}

/**
 * A transaction's category. The one you set in Mercury wins over Mercury's automatic guess,
 * since the guess is often wrong (a card autopay filed as "Fees").
 */
export function categoryOf(transaction: Pick<Transaction, "mercuryCategory" | "categoryData">): Category | undefined {
  const custom = transaction.categoryData;
  if (custom) return { key: `categoryId:${custom.id}`, label: custom.name, color: colorFor(custom.name) };
  const value = transaction.mercuryCategory;
  if (!value) return undefined;
  const label = labelFor(value);
  return { key: value, label, color: COLORS.get(value) ?? colorFor(label) };
}

/** "AlcoholAndBars" → "Alcohol & Bars" */
function labelFor(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ And /g, " & ");
}

/** Direction first; otherwise a stable color from the name, so the same category is always the same color. */
function colorFor(name: string): Color {
  if (MONEY_IN.test(name)) return Color.Green;
  if (MONEY_OUT.test(name)) return Color.Red;
  if (NEUTRAL.test(name)) return Color.SecondaryText;
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
