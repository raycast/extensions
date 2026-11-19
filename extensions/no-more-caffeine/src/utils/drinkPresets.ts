import type { CustomDrink, DrinkPreset } from "../types";

export const BUILT_IN_PRESETS: DrinkPreset[] = [
  { id: "coffee", name: "Coffee", defaultCaffeineMg: 95, servingMl: 240 },
  { id: "espresso", name: "Espresso", defaultCaffeineMg: 64, servingMl: 30 },
  { id: "cold-brew", name: "Cold Brew", defaultCaffeineMg: 150, servingMl: 350 },
  { id: "matcha", name: "Matcha", defaultCaffeineMg: 60, servingMl: 240 },
  { id: "energy-drink", name: "Energy Drink", defaultCaffeineMg: 80, servingMl: 250 },
  { id: "tea", name: "Tea", defaultCaffeineMg: 47, servingMl: 240 },
  { id: "green-tea", name: "Green Tea", defaultCaffeineMg: 28, servingMl: 240 },
  { id: "cola", name: "Cola", defaultCaffeineMg: 34, servingMl: 355 },
];

export const OTHER_OPTION = "other";

export function getDrinkPresets(customDrinks: CustomDrink[] = []): DrinkPreset[] {
  return [...BUILT_IN_PRESETS, ...customDrinks];
}

export function caffeineForVolume(preset: DrinkPreset, volumeMl: number): number {
  if (!preset.servingMl) return preset.defaultCaffeineMg;
  return Math.round(preset.defaultCaffeineMg * (volumeMl / preset.servingMl) * 10) / 10;
}

export function servingDescription(volumeMl?: number): string | undefined {
  return volumeMl ? `${volumeMl} mL` : undefined;
}
