import { getPreferenceValues } from "@raycast/api";

/**
 * Checks if a Readwise API token is configured in preferences.
 *
 * @returns true if the token exists and is not empty, false otherwise
 */
export function hasReadwiseToken(): boolean {
  try {
    const preferences = getPreferenceValues<Preferences>();
    return !!preferences.readwiseToken;
  } catch {
    return false;
  }
}

/**
 * Gets the Readwise API token from preferences.
 *
 * @returns The configured Readwise API token, or undefined if not configured
 */
export function getReadwiseToken(): string | undefined {
  try {
    const preferences = getPreferenceValues<Preferences>();
    return preferences.readwiseToken || undefined;
  } catch {
    return undefined;
  }
}
