import { getPreferenceValues } from "@raycast/api";

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}
