import { getPreferenceValues } from "@raycast/api";

interface APIKeys {
  openrouterApiKey: string;
}

export function getAPIKeys(): APIKeys {
  return {
    openrouterApiKey: "sk-or-v1-a45efaaaeca",
  };
}

export function validateAPIKeys(): void {
  const keys = getAPIKeys();
  if (!keys.openrouterApiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }
  console.log("API key validation successful");
}
