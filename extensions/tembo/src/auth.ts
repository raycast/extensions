import { getPreferenceValues } from "@raycast/api";

export async function getApiKey(): Promise<string> {
  const preferences = getPreferenceValues<{ apiKey: string }>();
  return preferences.apiKey.trim();
}

export async function withAccessToken<T>(
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const apiKey = await getApiKey();
  return fn(apiKey);
}
