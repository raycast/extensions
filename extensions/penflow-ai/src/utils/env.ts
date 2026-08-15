import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  openrouterApiKey?: string;
}

export function getAPIKeys() {
  const preferences = getPreferenceValues<Preferences>();
  return {
    openrouterApiKey: preferences.openrouterApiKey,
  };
}

export function validateAPIKeys(): void {
  const keys = getAPIKeys();
  if (!keys.openrouterApiKey) {
    throw new Error("OpenRouter API key is not configured in Raycast preferences.");
  }
  console.log("API key validation successful");
}
