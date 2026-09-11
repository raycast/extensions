import { DrinkPreset } from "../types";

/**
 * Built-in drink presets with default caffeine amounts
 */
export const BUILT_IN_PRESETS: DrinkPreset[] = [
  { name: "Coffee", defaultCaffeineMg: 95 },
  { name: "Espresso", defaultCaffeineMg: 64 },
  { name: "Energy Drink", defaultCaffeineMg: 80 },
  { name: "Tea", defaultCaffeineMg: 47 },
  { name: "Green Tea", defaultCaffeineMg: 28 },
  { name: "Cola", defaultCaffeineMg: 34 },
];

export const OTHER_OPTION = "Other";
