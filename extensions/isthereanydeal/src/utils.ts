import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_COUNTRY } from "./constants";

export function logBoth(...args: unknown[]) {
  const msg = args.map((a: unknown) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  console.log(msg);
}

export function getDefaultCountry(): string {
  const preferences = getPreferenceValues();
  const country = preferences.country;
  return typeof country === "string" && country.length === 2 ? country.toUpperCase() : DEFAULT_COUNTRY;
}

export function validateApiKey(): { isValid: boolean; apiKey: string } {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = typeof preferences.ITAD_API_KEY === "string" ? preferences.ITAD_API_KEY.trim() : "";
  const isValid = apiKey.length > 0;
  return { isValid, apiKey };
}

export function getStorageKey(key: string): string {
  return `isthereanydeal${key}`;
}
