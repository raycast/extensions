import { getPreferenceValues } from "@raycast/api";

export async function getApiConfig() {
  const preferences = getPreferenceValues<Preferences>();
  const { apiUrl, apiKey } = preferences;
  if (!apiUrl || !apiKey) {
    throw new Error("API configuration is not initialized");
  }
  return { apiUrl, apiKey };
}
