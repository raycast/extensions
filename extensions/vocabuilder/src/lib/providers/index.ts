import { providerError, type ProviderErrorSurface } from "../providerError";
import { anthropicJsonTransport } from "./anthropic";
import { geminiJsonTransport } from "./gemini";
import { geminiTts } from "./geminiTts";
import { openAiJsonTransport } from "./openai";
import { openAiTts } from "./openaiTts";
import type { JsonTransport, ProviderConfig, ProviderId, TtsAdapter, TtsConfig, TtsProviderId } from "./types";

export type ProviderChoice = "auto" | ProviderId;

/** The provider-related extension preferences, as Raycast hands them over (strings may be empty). */
export type ProviderPreferences = {
  provider: ProviderChoice;
  apiKey: string;
  apiBaseUrl?: string;
  translationModel?: string;
  ttsModel?: string;
};

type ProviderDefaults = {
  model?: string;
  /** Paired with `model`: sent only when the user left "Translation Model" empty. */
  reasoningEffort?: string;
  ttsModel?: string;
};

// Why these are not package.json defaults: AGENTS.md → Providers → Defaults.
const PROVIDER_DEFAULTS = {
  gemini: { model: "gemini-3.5-flash-lite", ttsModel: "gemini-3.1-flash-tts-preview" },
  anthropic: { model: "claude-haiku-5-5", reasoningEffort: "low" },
  openai: { model: "gpt-6-luna", reasoningEffort: "none", ttsModel: "gpt-4o-mini-tts" },
  "openai-compatible": {},
} as const satisfies Record<ProviderId, ProviderDefaults>;

const JSON_TRANSPORTS: Record<ProviderId, JsonTransport> = {
  gemini: geminiJsonTransport,
  anthropic: anthropicJsonTransport,
  openai: openAiJsonTransport,
  "openai-compatible": openAiJsonTransport,
};

const TTS_ADAPTERS: Record<TtsProviderId, TtsAdapter> = {
  gemini: geminiTts,
  openai: openAiTts,
};

const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: "Gemini",
  anthropic: "Anthropic",
  openai: "OpenAI",
  "openai-compatible": "the API server",
};

export function jsonTransportFor(provider: ProviderId): JsonTransport {
  return JSON_TRANSPORTS[provider];
}

function hasProviderTts(provider: ProviderId): provider is TtsProviderId {
  return provider in TTS_ADAPTERS;
}

/** `null` means the provider has no speech endpoint and pronunciation uses the macOS system voice. */
export function ttsFor(provider: TtsProviderId): TtsAdapter;
export function ttsFor(provider: ProviderId): TtsAdapter | null;
export function ttsFor(provider: ProviderId): TtsAdapter | null {
  return hasProviderTts(provider) ? TTS_ADAPTERS[provider] : null;
}

/** Display name for user-visible copy. Not capitalized for openai-compatible ("the API server"). */
export function providerLabel(provider: ProviderId): string {
  return PROVIDER_LABELS[provider];
}

/** `sk-ant-` is checked before the generic OpenAI `sk-` prefix it would otherwise match. */
function detectProviderFromKey(key: string): ProviderId | undefined {
  const trimmed = key.trim();
  if (trimmed.startsWith("sk-ant-")) return "anthropic";
  if (trimmed.startsWith("AIza")) return "gemini";
  if (trimmed.startsWith("sk-")) return "openai";
  return undefined;
}

/** The provider the preferences point at; `undefined` when Auto cannot recognize the key. Never throws. */
export function selectedProvider(prefs: Pick<ProviderPreferences, "provider" | "apiKey">): ProviderId | undefined {
  return prefs.provider === "auto" ? detectProviderFromKey(prefs.apiKey) : prefs.provider;
}

function resolveProviderId(prefs: ProviderPreferences, surface: ProviderErrorSurface): ProviderId {
  const provider = selectedProvider(prefs);
  if (provider) return provider;
  throw providerError({ domain: "infrastructure", kind: "provider-undetected", surface, provider: "unknown" });
}

/**
 * Turn preferences into the config a JSON transport needs. Configuration
 * errors (`provider-undetected`, `missing-model`) are thrown here, at call
 * time, so they reach the user through the normal toast router.
 */
export function resolveProviderConfig(prefs: ProviderPreferences): ProviderConfig {
  const provider = resolveProviderId(prefs, "translate");
  const defaults: ProviderDefaults = PROVIDER_DEFAULTS[provider];
  const customModel = prefs.translationModel?.trim() ?? "";
  const model = customModel || defaults.model;
  if (!model) {
    throw providerError({ domain: "infrastructure", kind: "missing-model", surface: "translate", provider });
  }
  const reasoningEffort = customModel ? undefined : defaults.reasoningEffort;
  return {
    provider,
    apiKey: prefs.apiKey.trim(),
    model,
    baseUrl: prefs.apiBaseUrl ?? "",
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

/** `null` selects the system voice when the provider or model cannot honor a pronunciation language. */
export function resolveTtsConfig(prefs: ProviderPreferences): TtsConfig | null {
  const provider = resolveProviderId(prefs, "tts");
  if (!hasProviderTts(provider)) return null;
  const model = prefs.ttsModel?.trim() || PROVIDER_DEFAULTS[provider].ttsModel;
  // Legacy OpenAI speech models ignore instructions, the only field carrying the selected language.
  if (provider === "openai" && (model === "tts-1" || model === "tts-1-hd")) return null;
  return {
    provider,
    apiKey: prefs.apiKey.trim(),
    model,
    baseUrl: prefs.apiBaseUrl ?? "",
  };
}
