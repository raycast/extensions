import { DictionaryEntry } from "../types";
import { lookUpWord as geminiLookUp } from "./gemini";
import { lookUpWord as claudeLookUp } from "./claude";
import { lookUpWord as openaiLookUp } from "./openai";

type Provider = "gemini" | "claude" | "openai";

export function detectProvider(apiKey: string): Provider {
  if (apiKey.startsWith("AIza")) return "gemini";
  if (apiKey.startsWith("sk-ant")) return "claude";
  if (apiKey.startsWith("sk-")) return "openai";
  throw new Error(
    "Unrecognized API key format. Keys should start with:\n• AIza... (Google Gemini)\n• sk-ant-... (Anthropic Claude)\n• sk-... (OpenAI)"
  );
}

export function providerLabel(provider: Provider): string {
  const labels: Record<Provider, string> = {
    gemini: "Google Gemini",
    claude: "Anthropic Claude",
    openai: "OpenAI",
  };
  return labels[provider];
}

export async function lookUpWord(word: string, apiKey: string): Promise<DictionaryEntry> {
  const provider = detectProvider(apiKey);
  switch (provider) {
    case "gemini":
      return geminiLookUp(word, apiKey);
    case "claude":
      return claudeLookUp(word, apiKey);
    case "openai":
      return openaiLookUp(word, apiKey);
  }
}
