import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../models/preferences.model";

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
