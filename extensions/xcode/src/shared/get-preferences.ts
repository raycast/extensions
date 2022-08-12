import { Preferences } from "../models/preferences/preferences.model";
import { getPreferenceValues } from "@raycast/api";

/**
 * A function to retrieve the preferences
 */
export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
