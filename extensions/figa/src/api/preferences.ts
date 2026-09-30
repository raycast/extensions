import { getPreferenceValues } from "@raycast/api";

export function getFigaPreferences(): Preferences {
  const preferences = getPreferenceValues<Preferences>();

  return {
    apiKey: preferences.apiKey.trim(),
  };
}
