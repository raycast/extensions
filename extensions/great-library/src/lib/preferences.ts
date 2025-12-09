import { getPreferenceValues } from "@raycast/api";

export function getExtensionPreferences() {
  const prefs = getPreferenceValues<Preferences>();
  return {
    apiKey: prefs["api-key"].trim(),
    storeDisplayName: (prefs["store-display-name"] || "Great Library").trim() || "Great Library",
  };
}
