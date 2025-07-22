import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_COUNTRY } from "./constants";

export function logBoth(...args: unknown[]) {
  const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  console.log(msg);
}

export function getDefaultCountry(): string {
  const preferences = getPreferenceValues();
  const country = preferences.country;
  return typeof country === "string" && country.length === 2 ? country.toUpperCase() : DEFAULT_COUNTRY;
}

export function validateApiKey(): { isValid: boolean; apiKey: string } {
  const preferences = getPreferenceValues();
  const apiKey = preferences.ITAD_API_KEY;
  const isValid = apiKey && typeof apiKey === "string" && apiKey.trim() !== "";
  return { isValid, apiKey: apiKey || "" };
}

export function getStorageKey(key: string): string {
  return `isthereanydeal_${key}`;
}
