import { getPreferenceValues } from "@raycast/api";

export function getKobbePreferences() {
  const preferences = getPreferenceValues<Preferences>();
  const baseUrl = preferences.baseUrl.trim().replace(/\/+$/, "");

  return {
    apiToken: preferences.apiToken?.trim() ?? "",
    baseUrl: baseUrl || "https://app.kobbe.io",
    defaultRange: preferences.defaultRange || "7d",
  };
}
