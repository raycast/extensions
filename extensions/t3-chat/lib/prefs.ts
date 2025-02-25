import { getPreferenceValues } from "@raycast/api";

export function getPrefs(): Preferences.AskT3Chat {
  return getPreferenceValues();
}
