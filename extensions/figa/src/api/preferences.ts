// fallow-ignore-next-line unresolved-import
import { getPreferenceValues } from "@raycast/api";

export interface FigaPreferences {
  apiKey: string;
  apiBaseUrl: string;
}

export function getFigaPreferences(): FigaPreferences {
  const preferences = getPreferenceValues<FigaPreferences>();

  return {
    apiKey: preferences.apiKey.trim(),
    apiBaseUrl: normalizeApiBaseUrl(preferences.apiBaseUrl),
  };
}

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}
