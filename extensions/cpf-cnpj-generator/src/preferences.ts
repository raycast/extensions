import { getPreferenceValues } from "@raycast/api";

export const PASTE_TO_APPLICATION = "pasteToApplication";

export type Preference = { [key: string]: any };

let preferences: Preference;

export function handlePreferences() {
  if (!preferences) {
    preferences = getPreferenceValues<Preference>();
  }

  return preferences;
}

export function handlePasteToApplication() {
  const preferences = handlePreferences();

  return preferences[PASTE_TO_APPLICATION];
}
