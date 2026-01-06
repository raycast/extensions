import { getPreferenceValues } from "@raycast/api";
import { LLMProvider } from "../api";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";

interface Preferences {
  provider: string;
  openaiApiKey?: string;
  openaiModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

export function createProvider(): LLMProvider {
  const prefs = getPreferenceValues<Preferences>();
  const provider = prefs.provider;

  switch (provider) {
    case "openai":
      return new OpenAIProvider({
        apiKey: prefs.openaiApiKey,
        model: prefs.openaiModel || "gpt-4o-mini",
      });
    case "anthropic":
      return new AnthropicProvider({
        apiKey: prefs.anthropicApiKey,
        model: prefs.anthropicModel || "claude-3-5-sonnet-latest",
      });
    case "gemini":
      return new GeminiProvider({
        apiKey: prefs.geminiApiKey,
        model: prefs.geminiModel || "gemini-2.0-flash-exp",
      });
    case "openrouter":
      return new OpenAIProvider({
        apiKey: prefs.openRouterApiKey,
        model: prefs.openRouterModel || "openai/gpt-4o-mini",
        baseUrl: "https://openrouter.ai/api/v1",
      });
    case "groq":
      return new OpenAIProvider({
        apiKey: prefs.groqApiKey,
        model: prefs.groqModel || "llama-3.3-70b-versatile",
        baseUrl: "https://api.groq.com/openai/v1",
      });
    case "ollama":
      return new OllamaProvider({
        baseUrl: prefs.ollamaBaseUrl,
        model: prefs.ollamaModel || "llama3",
      });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
