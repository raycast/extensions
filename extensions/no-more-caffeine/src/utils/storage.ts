import { LocalStorage } from "@raycast/api";
import { CaffeineIntake, CustomDrink } from "../types";

const INTAKES_KEY = "caffeine-intakes";
const CUSTOM_DRINKS_KEY = "custom-drinks";
const TIME_WINDOW_HOURS = 48;

/**
 * Save a caffeine intake record
 */
export async function saveIntake(intake: CaffeineIntake): Promise<void> {
  const intakes = await getIntakes();
  intakes.push(intake);
  await LocalStorage.setItem(INTAKES_KEY, JSON.stringify(intakes));
}

/**
 * Get all caffeine intake records
 * Converts timestamp strings from storage back to Date objects
 *
 * @returns Array of caffeine intake records with Date objects for timestamps
 */
export async function getIntakes(): Promise<CaffeineIntake[]> {
  const stored = await LocalStorage.getItem<string>(INTAKES_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return parsed.map((intake: CaffeineIntake) => ({
      ...intake,
      timestamp: new Date(intake.timestamp),
    }));
  } catch (error) {
    console.error("Error parsing intakes:", error);
    return [];
  }
}

/**
 * Delete a caffeine intake record
 */
export async function deleteIntake(id: string): Promise<void> {
  const intakes = await getIntakes();
  const filtered = intakes.filter((intake) => intake.id !== id);
  await LocalStorage.setItem(INTAKES_KEY, JSON.stringify(filtered));
}

/**
 * Clear old intake records (older than time window)
 */
export async function clearOldIntakes(): Promise<void> {
  const intakes = await getIntakes();
  const cutoffTime = new Date(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000);
  const filtered = intakes.filter((intake) => intake.timestamp >= cutoffTime);
  await LocalStorage.setItem(INTAKES_KEY, JSON.stringify(filtered));
}

/**
 * Get all custom drink presets
 */
export async function getCustomDrinks(): Promise<CustomDrink[]> {
  const stored = await LocalStorage.getItem<string>(CUSTOM_DRINKS_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error parsing custom drinks:", error);
    return [];
  }
}

/**
 * Save a custom drink preset
 */
export async function saveCustomDrink(drink: CustomDrink): Promise<void> {
  const drinks = await getCustomDrinks();
  const existingIndex = drinks.findIndex((d) => d.id === drink.id);

  if (existingIndex >= 0) {
    drinks[existingIndex] = drink;
  } else {
    drinks.push(drink);
  }

  await LocalStorage.setItem(CUSTOM_DRINKS_KEY, JSON.stringify(drinks));
}

/**
 * Delete a custom drink preset
 */
export async function deleteCustomDrink(id: string): Promise<void> {
  const drinks = await getCustomDrinks();
  const filtered = drinks.filter((drink) => drink.id !== id);
  await LocalStorage.setItem(CUSTOM_DRINKS_KEY, JSON.stringify(filtered));
}
