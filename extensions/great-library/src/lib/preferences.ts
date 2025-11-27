import { getPreferenceValues } from "@raycast/api";

type RawExtensionPreferences = Preferences & {
  "api-key": string;
  "store-display-name": string;
};

export interface ExtensionPreferences {
  apiKey: string;
  storeDisplayName: string;
}

export function getExtensionPreferences(): ExtensionPreferences {
  const raw = getPreferenceValues<RawExtensionPreferences>();
  const apiKey = raw["api-key"].trim();
  const storeDisplayName = (raw["store-display-name"] || "Great Library").trim() || "Great Library";

  return { apiKey, storeDisplayName };
}
