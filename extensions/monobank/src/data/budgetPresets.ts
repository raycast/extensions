/** A suggested budget. Every category is an English name from `mcc.json`. */
export interface BudgetPreset {
  name: string;
  categories: string[];
}

export const budgetPresets: BudgetPreset[] = [
  { name: "Cafes & Restaurants", categories: ["Cafe. Restaurants", "Bars", "Fast Food"] },
  { name: "Groceries", categories: ["Grocery", "Food stores", "Meat", "Sweets", "Farm goods", "Bakeries"] },
  { name: "Taxi", categories: ["Taxi"] },
  {
    name: "Transport",
    categories: ["Passenger transportation", "Passenger railways", "Transportation. Bus", "Railway"],
  },
  { name: "Car", categories: ["Gas station", "Service Stations", "Maintenance stations", "Parking"] },
  { name: "Health", categories: ["Drug Stores", "Medicine", "Dentistry", "Hospitals", "Medical services"] },
  { name: "Clothes & Shoes", categories: ["Clothes", "Accessories", "Shoes", "Womens clothing", "Clothing stores"] },
  { name: "Subscriptions & Games", categories: ["Digital Goods", "Games", "Applications"] },
  {
    name: "Entertainment",
    categories: ["Cinemas", "Tickets", "Entertainment", "Entertainment and sport", "Sports clubs"],
  },
  { name: "Beauty", categories: ["The beauty", "Health and beauty", "Cosmetics"] },
  { name: "Pets", categories: ["Pet supplies", "Veterinary Services"] },
];

/** The preset named `name`, case-insensitively. */
export function findPreset(name: string) {
  const query = name.trim().toLowerCase();
  return budgetPresets.find((preset) => preset.name.toLowerCase() === query);
}
