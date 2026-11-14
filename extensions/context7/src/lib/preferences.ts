import { getPreferenceValues } from "@raycast/api";

/**
 * The API key is optional: Context7 serves both v2 endpoints anonymously at a lower
 * monthly quota, so the extension stays usable before a key is entered.
 */
export function getApiKey() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const trimmedApiKey = apiKey?.trim();

  return trimmedApiKey ? trimmedApiKey : undefined;
}
