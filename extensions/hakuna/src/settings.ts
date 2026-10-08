import { getPreferenceValues } from "@raycast/api";

export function getSettings(): Preferences {
  return getPreferenceValues<Preferences>();
}
