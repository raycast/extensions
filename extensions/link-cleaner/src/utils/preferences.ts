import { getPreferenceValues } from "@raycast/api";

export function getPreferences() {
  const preferences: Preferences.CleanSelectedText | Preferences.CleanClipboardText = getPreferenceValues();
  return preferences;
}
