// Provider exports
export {
  Provider,
  ProviderType,
  PROVIDER_NAMES,
  DEFAULT_MODELS,
} from "./types";
export { openRouterProvider } from "./openrouter";
export { geminiProvider } from "./gemini";
export { openaiProvider } from "./openai";
export { anthropicProvider } from "./anthropic";
export { ollamaProvider } from "./ollama";
export { groqProvider } from "./groq";

import { Provider, ProviderType } from "./types";
import { openRouterProvider } from "./openrouter";
import { geminiProvider } from "./gemini";
import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { ollamaProvider } from "./ollama";
import { groqProvider } from "./groq";

export function getProvider(type: ProviderType): Provider {
  switch (type) {
    case "openrouter":
      return openRouterProvider;
    case "gemini":
      return geminiProvider;
    case "openai":
      return openaiProvider;
    case "anthropic":
      return anthropicProvider;
    case "ollama":
      return ollamaProvider;
    case "groq":
      return groqProvider;
    default:
      return openRouterProvider;
  }
}
