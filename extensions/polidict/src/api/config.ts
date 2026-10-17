import { getPreferenceValues } from "@raycast/api";

const DEFAULT_API_URL = "https://api.polidict.com";

export function getApiUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  const configuredUrl = preferences.apiUrl?.trim();

  if (!configuredUrl) {
    return DEFAULT_API_URL;
  }

  return configuredUrl.replace(/\/+$/, "");
}
