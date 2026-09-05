import { getPreferenceValues } from "@raycast/api";

/**
 * Typed accessor over the extension's preferences (declared in package.json).
 * Trims the API key so a stray copy-paste newline doesn't break the bearer header.
 */
export function getPreferences(): Preferences {
  const prefs = getPreferenceValues<Preferences>();
  return {
    apiKey: prefs.apiKey?.trim() ?? "",
  };
}
