import { Preference } from "./types";
import { getPreferenceValues as gp } from "@raycast/api";

export function getPreferenceValues() {
  return gp<Preference>();
}
