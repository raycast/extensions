import { getPreferenceValues } from "@raycast/api";

export async function getApiConfig() {
  const preferences = getPreferenceValues<Preferences>();
  const { host, apiKey } = preferences;
  if (!host || !apiKey) {
    throw new Error("API configuration is not initialized");
  }
  return { host, apiKey };
}
