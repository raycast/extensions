import { getPreferenceValues } from "@raycast/api";
import { parseSettings, Settings } from "./parse-settings";

export function readSettings(): Settings {
  return parseSettings(getPreferenceValues<Preferences.InsertDate>());
}
