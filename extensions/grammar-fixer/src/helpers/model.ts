import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Provider } from "../types";

export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4.1-nano",
  openrouter: "openai/gpt-4.1-nano",
  google: "gemini-2.5-flash-lite",
  groq: "llama-3.3-70b-versatile",
  ollama: "llama3.2",
};

const PROVIDER_BASE_URLS: Partial<Record<Provider, string>> = {
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  ollama: "http://localhost:11434/v1",
};

export function buildModel(prefs: Preferences) {
  const modelId = prefs.model?.trim() || DEFAULT_MODELS[prefs.provider];
  const customURL = prefs.customBaseURL?.trim();

  switch (prefs.provider) {
    case "anthropic":
      return createAnthropic({
        apiKey: prefs.apiKey,
        ...(customURL && { baseURL: customURL }),
      })(modelId);
    case "google":
      return createGoogleGenerativeAI({
        apiKey: prefs.apiKey,
        ...(customURL && { baseURL: customURL }),
      })(modelId);
    case "openai":
    case "openrouter":
    case "groq":
    case "ollama": {
      const baseURL = customURL ?? PROVIDER_BASE_URLS[prefs.provider];
      const apiKey = prefs.provider === "ollama" ? "ollama" : prefs.apiKey;
      return createOpenAI({ apiKey, ...(baseURL && { baseURL }) })(modelId);
    }
    default:
      throw new Error(
        `Unknown provider: "${prefs.provider}". Check your extension preferences.`,
      );
  }
}
