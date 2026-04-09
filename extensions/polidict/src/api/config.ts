import { getPreferenceValues } from "@raycast/api";

const DEFAULT_API_URL = "https://api.polidict.com";

interface ApiPreferences {
  apiUrl?: string;
}

export function getApiUrl(): string {
  const preferences = getPreferenceValues<ApiPreferences>();
  const configuredUrl = preferences.apiUrl?.trim();

  if (!configuredUrl) {
    return DEFAULT_API_URL;
  }

  return configuredUrl.replace(/\/+$/, "");
}
