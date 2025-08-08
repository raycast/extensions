import { getPreferenceValues, LocalStorage } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

export async function getApiKey(): Promise<string | null> {
  // First try LocalStorage (where Set API Key command stores the working key)
  const storedKey = await LocalStorage.getItem("pain-is-api-key");
  if (storedKey && typeof storedKey === "string") {
    return storedKey;
  }

  // Fall back to preferences if LocalStorage is empty
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;

  return apiKey || null;
}
