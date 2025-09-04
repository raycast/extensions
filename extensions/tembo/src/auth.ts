import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string; // Required preference, so no need for optional
}

export async function getApiKey(): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiKey.trim();
}

export async function withAccessToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const apiKey = await getApiKey();
  return fn(apiKey);
}
