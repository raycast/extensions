import { getPreferenceValues } from "@raycast/api";

export function getDaytonaPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function resolveDaytonaTarget(preferences: Preferences): string | undefined {
  return preferences.target && preferences.target !== "auto" ? preferences.target : undefined;
}

export function resolveDaytonaApiUrl(preferences: Preferences): string | undefined {
  return preferences.apiUrl?.trim() || undefined;
}

export function getDaytonaClientOptions(preferences: Preferences) {
  return {
    apiKey: preferences.apiKey,
    apiUrl: resolveDaytonaApiUrl(preferences),
    target: resolveDaytonaTarget(preferences),
  };
}
