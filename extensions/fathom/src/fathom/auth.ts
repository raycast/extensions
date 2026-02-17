/**
 * Fathom API Key Authentication
 *
 * Simple API key management — reads from Raycast preferences
 * and provides validation state to avoid repeated failed requests.
 */
import { getPreferenceValues } from "@raycast/api";

interface FathomPreferences {
  fathomApiKey: string;
  exportDirectory?: string;
  verboseLogging?: boolean;
}

// Validation state: avoids repeated API calls with a known-bad key
let apiKeyValidationState: "unknown" | "valid" | "invalid" = "unknown";

/**
 * Get the Fathom API key from Raycast preferences.
 *
 * Does NOT fast-fail on known-invalid state — that check belongs at the
 * component level to avoid race conditions between concurrent API calls.
 *
 * @throws Error if the API key is missing (empty or not configured)
 */
export function getFathomApiKey(): string {
  const prefs = getPreferenceValues<FathomPreferences>();
  const key = prefs.fathomApiKey?.trim();

  if (!key) {
    throw new Error("API_KEY_MISSING: No API key configured. Please set your Fathom API Key in Extension Preferences.");
  }

  return key;
}

/** Mark the API key as valid (called on first successful API response) */
export function markApiKeyValid(): void {
  apiKeyValidationState = "valid";
}

/** Mark the API key as invalid (called on 401 response) */
export function markApiKeyInvalid(): void {
  apiKeyValidationState = "invalid";
}

/** Check if the API key is known to be invalid */
export function isApiKeyKnownInvalid(): boolean {
  return apiKeyValidationState === "invalid";
}

/** Reset validation state (e.g., when preferences change) */
export function resetApiKeyValidation(): void {
  apiKeyValidationState = "unknown";
}

/** Check if an API key is configured (non-throwing, for component-level guards) */
export function hasApiKey(): boolean {
  const prefs = getPreferenceValues<FathomPreferences>();
  return !!prefs.fathomApiKey?.trim();
}
