import { getPreferenceValues } from "@raycast/api";

// Production API base URL. For local development against the web app, temporarily
// change this to "http://localhost:8788".
export const BASE_URL = "https://bumpnamematch.com";

/** Read extension preferences: the optional personal API key. */
export function getPrefs(): { baseUrl: string; apiKey?: string } {
  const { apiKey } = getPreferenceValues<Preferences>();
  return { baseUrl: BASE_URL, apiKey: apiKey?.trim() || undefined };
}
