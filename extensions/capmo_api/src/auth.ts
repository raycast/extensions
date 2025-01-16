import { prefs } from "./preferences";

/**
 * Retrieves the Capmo API token from preferences.
 */
export function getCapmoToken(): string {
  return prefs.capmoApiToken;
}
