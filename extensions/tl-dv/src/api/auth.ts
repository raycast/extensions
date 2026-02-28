import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";

let cachedAccessToken: string | undefined;

export async function getAccessToken(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("API key not found. Please configure your tl;dv API key in the extension preferences.");
  }

  cachedAccessToken = preferences.apiKey;
  return cachedAccessToken;
}

export function clearAccessToken(): void {
  cachedAccessToken = undefined;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
