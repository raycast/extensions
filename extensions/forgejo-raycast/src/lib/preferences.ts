import { getPreferenceValues } from "@raycast/api";

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
