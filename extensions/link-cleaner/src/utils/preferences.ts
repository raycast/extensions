import { getPreferenceValues } from "@raycast/api";

export function getPreferences() {
  const preferences: Preferences = getPreferenceValues();
  return preferences;
}
