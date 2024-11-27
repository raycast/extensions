import { getPreferenceValues } from "@raycast/api";
import { Preference } from "./types";

export function getPreferences() {
  return getPreferenceValues<Preference>();
}
