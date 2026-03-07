import { getPreferenceValues } from "@raycast/api";

interface ExtensionPreferences {
  apiKey: string;
}

export function getApiKey() {
  const { apiKey } = getPreferenceValues<ExtensionPreferences>();
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey) {
    throw new Error("Set your Context7 API key in the extension preferences.");
  }

  return trimmedApiKey;
}
