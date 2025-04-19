import { getPreferenceValues } from "@raycast/api";

export function getPreference(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}
