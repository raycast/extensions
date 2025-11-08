import { getPreferenceValues } from "@raycast/api";
import { AIProvider } from "./base";
import { OllamaProvider } from "./ollama";

interface ProviderPreferences {
  provider: "ollama" | "openai";
}

export async function getProvider(): Promise<AIProvider> {
  const preferences = getPreferenceValues<ProviderPreferences>();

  switch (preferences.provider) {
    case "ollama":
    default:
      return new OllamaProvider();
  }
}

export * from "./base";
export * from "./ollama";
