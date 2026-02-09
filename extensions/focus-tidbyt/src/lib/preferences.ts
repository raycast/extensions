import { getPreferenceValues } from "@raycast/api";

export type ExtensionPreferences = {
  pushProvider?: "tidbyt" | "tronbyt";
  tidbytDeviceId?: string;
  tidbytApiToken?: string;
  tidbytPixletPath?: string;
  tronbytBaseUrl?: string;
  tronbytDeviceId?: string;
  tronbytApiToken?: string;
  tronbytAuthHeader?: string;
  installationId?: string;
  updateInterval?: string;
  startShortcutName?: string;
  completeShortcutName?: string;
};

export function getPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}
