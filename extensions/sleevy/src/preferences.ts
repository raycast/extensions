import { getPreferenceValues } from "@raycast/api";

export type SleevyPreferences = {
  readonly apiUrl: string;
  readonly apiKey: string;
  readonly sourceName?: string;
};

export function getSleevyPreferences(): SleevyPreferences {
  const preferences = getPreferenceValues();

  return {
    apiUrl: preferences.apiUrl.trim().replace(/\/+$/, ""),
    apiKey: preferences.apiKey.trim(),
    ...(preferences.sourceName?.trim()
      ? { sourceName: preferences.sourceName.trim() }
      : {}),
  };
}
