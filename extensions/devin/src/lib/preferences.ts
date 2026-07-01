import { getPreferenceValues } from "@raycast/api";

export type ExtensionPreferences = Preferences;

export function getExtensionPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}
