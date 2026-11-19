import { LocalStorage } from "@raycast/api";
import { CaffeineIntake, CustomDrink } from "../types";

import { parseIntakes } from "./intakeData";

const INTAKES_KEY = "caffeine-intakes";
const CUSTOM_DRINKS_KEY = "custom-drinks";
const FAVORITES_KEY = "favorite-drinks";

let pendingWrite: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(write: () => Promise<T>): Promise<T> {
  const operation = pendingWrite.then(write);
  pendingWrite = operation.catch(() => undefined);
  return operation;
}

function mutateIntakes<T>(update: (intakes: CaffeineIntake[]) => T): Promise<T> {
  return enqueueWrite(async () => {
    const intakes = await getIntakes();
    const result = update(intakes);
    await LocalStorage.setItem(INTAKES_KEY, JSON.stringify(intakes));
    return result;
  });
}

export async function getIntakes(): Promise<CaffeineIntake[]> {
  const stored = await LocalStorage.getItem<string>(INTAKES_KEY);
  return stored ? parseIntakes(JSON.parse(stored)) : [];
}

export function saveIntake(intake: CaffeineIntake): Promise<void> {
  return mutateIntakes((intakes) => {
    if (!intakes.some(({ id }) => id === intake.id)) intakes.push(intake);
  });
}

export function updateIntake(updated: CaffeineIntake): Promise<void> {
  return mutateIntakes((intakes) => {
    const index = intakes.findIndex((intake) => intake.id === updated.id);
    if (index < 0) throw new Error("This intake no longer exists.");
    intakes[index] = updated;
  });
}

export function deleteIntake(id: string): Promise<void> {
  return mutateIntakes((intakes) => {
    const index = intakes.findIndex((intake) => intake.id === id);
    if (index >= 0) intakes.splice(index, 1);
  });
}

export function mergeIntakes(incoming: CaffeineIntake[]): Promise<number> {
  return mutateIntakes((intakes) => {
    const ids = new Set(intakes.map(({ id }) => id));
    const previousCount = intakes.length;
    for (const intake of incoming) {
      if (ids.has(intake.id)) continue;
      intakes.push(intake);
      ids.add(intake.id);
    }
    return intakes.length - previousCount;
  });
}

export async function getFavoriteIds(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
  const data: unknown = stored ? JSON.parse(stored) : [];
  return Array.isArray(data) ? data.filter((id): id is string => typeof id === "string") : [];
}

export function setFavorite(id: string, favorite: boolean): Promise<void> {
  return enqueueWrite(async () => {
    const ids = new Set(await getFavoriteIds());
    if (favorite) ids.add(id);
    else ids.delete(id);
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
  });
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
