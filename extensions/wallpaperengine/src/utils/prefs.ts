import { getPreferenceValues } from "@raycast/api";

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}
