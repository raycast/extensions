import { getPreferenceValues } from "@raycast/api";

export function getPreferences() {
  const preferences = getPreferenceValues<Preferences>();

  return {
    apiBaseUrl: preferences.apiBaseUrl.replace(/\/+$/, ""),
    authBaseUrl: preferences.authBaseUrl.replace(/\/+$/, ""),
  };
}
