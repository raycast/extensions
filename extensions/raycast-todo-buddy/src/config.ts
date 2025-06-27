import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export function getConfig() {
  return getPreferenceValues<Preferences>();
}
