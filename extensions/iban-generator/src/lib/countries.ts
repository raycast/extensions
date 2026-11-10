import { COUNTRIES_RAW } from "./countries-data";
import type { Country } from "./types";

export const COUNTRIES: Country[] = [...COUNTRIES_RAW].sort((a, b) => a.name.localeCompare(b.name, "en"));

export function getCountry(code: string): Country | undefined {
  const upper = code.toUpperCase();
  return COUNTRIES.find((c) => c.code === upper);
}
