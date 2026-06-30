import { getPreferenceValues } from "@raycast/api";
import type { Preferences } from "./types";

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getDefaultLimit(preferences = getPreferences()): number {
  return Number(preferences.defaultLimit);
}

export function hasApiKey(preferences = getPreferences()): boolean {
  return Boolean(preferences.apiKey?.trim());
}
