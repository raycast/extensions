import { getPreferenceValues } from "@raycast/api";

/**
 * Checks if a Readwise API token is configured in preferences.
 *
 * @returns true if the token exists and is not empty, false otherwise
 */
export function hasReadwiseToken(): boolean {
  try {
    const preferences = getPreferenceValues();
    return !!preferences.readwiseToken;
  } catch {
    return false;
  }
}

/**
 * Gets the Readwise API token from preferences.
 *
 * @returns The configured Readwise API token
 * @throws Error if the token is not configured
 */
export function getReadwiseToken(): string {
  const preferences = getPreferenceValues();
  if (!preferences.readwiseToken) {
    throw new Error("Readwise API token not configured");
  }
  return preferences.readwiseToken;
}
