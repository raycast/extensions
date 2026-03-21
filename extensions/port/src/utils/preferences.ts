import { getPreferenceValues } from "@raycast/api";

export function getPortPreferences() {
  return getPreferenceValues<Preferences>();
}

export function getBaseUrl(): string {
  const { baseUrl } = getPortPreferences();
  return baseUrl || "https://api.getport.io";
}
