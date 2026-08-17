import { getPreferenceValues } from "@raycast/api";

export type AppPreferences = Preferences;

export function getConfiguredPreferences(): AppPreferences {
  return getPreferenceValues<Preferences>();
}
