import { getPreferenceValues } from "@raycast/api";

export function getApiKey() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey) {
    throw new Error("Set your Context7 API key in the extension preferences.");
  }

  return trimmedApiKey;
}
