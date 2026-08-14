import type { ProviderDefinition } from "./types";
import { basetenProvider } from "./catalog/baseten";
import { cerebrasProvider } from "./catalog/cerebras";
import { claudeProvider } from "./catalog/claude";
import { cohereProvider } from "./catalog/cohere";
import { deepseekProvider } from "./catalog/deepseek";
import { elevenLabsProvider } from "./catalog/elevenlabs";
import { fireworksProvider } from "./catalog/fireworks";
import { geminiProvider } from "./catalog/gemini";
import { groqProvider } from "./catalog/groq";
import { huggingFaceProvider } from "./catalog/hugging-face";
import { minimaxProvider } from "./catalog/minimax";
import { mistralProvider } from "./catalog/mistral";
import { moonshotProvider } from "./catalog/moonshot";
import { openaiProvider } from "./catalog/openai";
import { openRouterProvider } from "./catalog/openrouter";
import { perplexityProvider } from "./catalog/perplexity";
import { replicateProvider } from "./catalog/replicate";
import { stabilityProvider } from "./catalog/stability";
import { togetherProvider } from "./catalog/together";
import { xaiProvider } from "./catalog/xai";

export const PROVIDERS = [
  openaiProvider,
  claudeProvider,
  geminiProvider,
  xaiProvider,
  deepseekProvider,
  moonshotProvider,
  minimaxProvider,
  mistralProvider,
  cohereProvider,
  perplexityProvider,
  openRouterProvider,
  groqProvider,
  togetherProvider,
  fireworksProvider,
  cerebrasProvider,
  replicateProvider,
  huggingFaceProvider,
  basetenProvider,
  elevenLabsProvider,
  stabilityProvider,
] as const satisfies readonly ProviderDefinition[];

export type ProviderPreferenceKey = (typeof PROVIDERS)[number]["preferenceKey"];
export type ProviderPreferences = Partial<Record<ProviderPreferenceKey, boolean>>;

export const DEFAULT_ENABLED_PROVIDER_IDS = [
  "openai",
  "claude",
  "gemini-api",
  "xai",
  "deepseek",
  "openrouter",
] as const;

const DEFAULT_ENABLED_PROVIDERS = new Set<string>(DEFAULT_ENABLED_PROVIDER_IDS);

export function getEnabledProviders(
  preferences: ProviderPreferences,
): readonly ProviderDefinition<ProviderPreferenceKey>[] {
  return PROVIDERS.filter(
    (provider) => preferences[provider.preferenceKey] ?? DEFAULT_ENABLED_PROVIDERS.has(provider.id),
  );
}

export function isProviderEnabledByDefault(providerId: string): boolean {
  return DEFAULT_ENABLED_PROVIDERS.has(providerId);
}
