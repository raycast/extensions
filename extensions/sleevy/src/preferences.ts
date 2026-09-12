import { getPreferenceValues } from "@raycast/api";

export type SleevyPreferences = {
  readonly apiUrl: string;
  readonly webUrl?: string;
  readonly sourceName?: string;
};

export function getSleevyPreferences(): SleevyPreferences {
  const preferences = getPreferenceValues<Preferences>();

  return {
    apiUrl: preferences.apiUrl.trim().replace(/\/+$/, ""),
    ...(preferences.webUrl?.trim()
      ? { webUrl: preferences.webUrl.trim().replace(/\/+$/, "") }
      : {}),
    ...(preferences.sourceName?.trim()
      ? { sourceName: preferences.sourceName.trim() }
      : {}),
  };
}
