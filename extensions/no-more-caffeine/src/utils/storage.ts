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
    const parsedUnknown = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsedUnknown)) {
      return [];
    }

    const parsedArray = parsedUnknown as Array<Record<string, unknown>>;

    // Convert and validate each entry without using `any`
    const withDates: CaffeineIntake[] = parsedArray.map((intake) => {
      const ts = intake.timestamp;
      let timestamp: Date;
      if (typeof ts === "string") {
        timestamp = new Date(ts);
      } else if (typeof ts === "number") {
        timestamp = new Date(ts);
      } else {
        timestamp = new Date();
      }

      const amountRaw = intake.amount;
      const amount = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);

      return {
        id: typeof intake.id === "string" ? intake.id : String(intake.id),
        timestamp,
        amount,
        drinkType: typeof intake.drinkType === "string" ? intake.drinkType : String(intake.drinkType),
        amountDescription: typeof intake.amountDescription === "string" ? intake.amountDescription : undefined,
      } as CaffeineIntake;
    });

    // Cleanup old intakes older than TIME_WINDOW_HOURS
    const cutoffTime = new Date(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000);
    const filtered = withDates.filter((intake) => intake.timestamp >= cutoffTime);

    if (filtered.length !== withDates.length) {
      // Persist cleaned data back to storage
      await LocalStorage.setItem(INTAKES_KEY, JSON.stringify(filtered));
    }

    return filtered;
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
// Note: old-intake cleanup is performed within `getIntakes` to avoid unused exported helpers.

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
