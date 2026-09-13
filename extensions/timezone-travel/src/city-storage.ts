import { LocalStorage } from "@raycast/api";
import { parseStoredCities } from "./cities";
import type { City } from "./cities";

const CITY_STORAGE_KEY = "selected-cities-v1";

export async function loadCities(): Promise<City[]> {
  const stored = await LocalStorage.getItem<string>(CITY_STORAGE_KEY);
  return parseStoredCities(stored);
}

export async function saveCities(cities: City[]): Promise<void> {
  await LocalStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(cities));
}
