import { getPreferenceValues } from "@raycast/api";
import { Fathom } from "fathom-typescript";

let cachedClient: Fathom | null = null;

/**
 * Get or create a singleton Fathom SDK client instance
 *
 * Note: SDK v0.0.30 has strict Zod validation that sometimes fails even when
 * the API returns valid data. API functions handle this with HTTP fallbacks.
 *
 * @throws Error if API key is not configured
 */
export function getFathomClient(): Fathom {
  if (cachedClient) {
    return cachedClient;
  }

  const { fathomApiKey } = getPreferenceValues<Preferences>();

  if (!fathomApiKey || fathomApiKey.trim() === "") {
    throw new Error("API_KEY_MISSING: Fathom API Key is not set. Please configure it in Extension Preferences.");
  }

  cachedClient = new Fathom({
    security: {
      apiKeyAuth: fathomApiKey,
    },
  });

  return cachedClient;
}

/**
 * Clear the cached client (useful for testing or when credentials change)
 */
export function clearClientCache(): void {
  cachedClient = null;
}

/**
 * Get the API key from preferences
 */
export function getApiKey(): string {
  const { fathomApiKey } = getPreferenceValues<Preferences>();

  if (!fathomApiKey || fathomApiKey.trim() === "") {
    throw new Error("API_KEY_MISSING: Fathom API Key is not set. Please configure it in Extension Preferences.");
  }

  return fathomApiKey;
}
