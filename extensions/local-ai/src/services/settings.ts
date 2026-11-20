import { getPreferenceValues } from "@raycast/api";
import { parseSettings, type Settings } from "../lib/settings";

export function getSettings(): Settings {
  return parseSettings(getPreferenceValues<Preferences>());
}
