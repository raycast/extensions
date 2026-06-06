import type { ProviderName, TtsProviderName } from "../llm/config";
import { MissingKeyError, resolveMimoBaseURL } from "../llm/config";
import {
  DEFAULT_TTS_MODELS,
  DEFAULT_TTS_VOICES,
  TTS_MODELS,
  TTS_PROVIDER_IDS,
  TTS_VOICES,
  knownModelOrDefault,
  knownVoiceOrDefault,
} from "../llm/models";
import type { TtsConfig, TtsPrefs } from "./types";

export const GEMINI_TTS_BASE =
  "https://generativelanguage.googleapis.com/v1beta";
export const QWEN_TTS_BASE = {
  beijing: "https://dashscope.aliyuncs.com/api/v1",
  intl: "https://dashscope-intl.aliyuncs.com/api/v1",
} as const;

export function resolveTtsProvider(
  analysisProvider: ProviderName,
  prefs: TtsPrefs,
): TtsProviderName {
  const choice = prefs.ttsProvider || "follow-analysis";
  if (
    choice !== "follow-analysis" &&
    (TTS_PROVIDER_IDS as readonly string[]).includes(choice)
  )
    return choice;
  const available = getAvailableTtsProviders(prefs);
  if (
    (TTS_PROVIDER_IDS as readonly string[]).includes(analysisProvider) &&
    available.includes(analysisProvider as TtsProviderName)
  ) {
    return analysisProvider;
  }
  if (available.length > 0) return available[0];
  return "qwen"; // none set → resolveTtsConfig throws a clear MissingKeyError
}

export function getAvailableTtsProviders(prefs: TtsPrefs): TtsProviderName[] {
  return TTS_PROVIDER_IDS.filter((provider) => {
    if (provider === "qwen") return Boolean(prefs.qwenApiKey?.trim());
    if (provider === "mimo") return Boolean(prefs.mimoApiKey?.trim());
    if (provider === "gemini") return Boolean(prefs.geminiApiKey?.trim());
    return Boolean(prefs.openaiApiKey?.trim());
  });
}

export function resolveTtsConfig(
  provider: TtsProviderName,
  prefs: TtsPrefs,
): TtsConfig {
  if (provider === "openai") {
    if (!prefs.openaiApiKey) throw new MissingKeyError("openai");
    return {
      provider,
      apiKey: prefs.openaiApiKey,
      voice: knownVoiceOrDefault(
        prefs.openaiTtsVoice,
        TTS_VOICES.openai,
        DEFAULT_TTS_VOICES.openai,
      ),
      model: knownModelOrDefault(
        prefs.openaiTtsModel,
        TTS_MODELS.openai,
        DEFAULT_TTS_MODELS.openai,
      ),
    };
  }
  if (provider === "gemini") {
    if (!prefs.geminiApiKey) throw new MissingKeyError("gemini");
    return {
      provider,
      apiKey: prefs.geminiApiKey,
      voice: knownVoiceOrDefault(
        prefs.geminiTtsVoice,
        TTS_VOICES.gemini,
        DEFAULT_TTS_VOICES.gemini,
      ),
      model: knownModelOrDefault(
        prefs.geminiTtsModel,
        TTS_MODELS.gemini,
        DEFAULT_TTS_MODELS.gemini,
      ),
      baseURL: GEMINI_TTS_BASE,
    };
  }
  if (provider === "mimo") {
    if (!prefs.mimoApiKey) throw new MissingKeyError("mimo");
    return {
      provider,
      apiKey: prefs.mimoApiKey,
      voice: knownVoiceOrDefault(
        prefs.mimoTtsVoice,
        TTS_VOICES.mimo,
        DEFAULT_TTS_VOICES.mimo,
      ),
      model: knownModelOrDefault(
        prefs.mimoTtsModel,
        TTS_MODELS.mimo,
        DEFAULT_TTS_MODELS.mimo,
      ),
      baseURL: mimoTtsBaseURL(resolveMimoBaseURL(prefs.mimoBaseURL)),
    };
  }
  if (!prefs.qwenApiKey) throw new MissingKeyError("qwen");
  const region = prefs.qwenRegion === "intl" ? "intl" : "beijing";
  const base = QWEN_TTS_BASE[region];
  return {
    provider,
    apiKey: prefs.qwenApiKey,
    voice: knownVoiceOrDefault(
      prefs.qwenTtsVoice,
      TTS_VOICES.qwen,
      DEFAULT_TTS_VOICES.qwen,
    ),
    model: knownModelOrDefault(
      prefs.qwenTtsModel,
      TTS_MODELS.qwen,
      DEFAULT_TTS_MODELS.qwen,
    ),
    baseURL: base,
  };
}

export function buildTtsInstructions(rate: number): string {
  const base = [
    "Purpose: this text will be spoken aloud by a text-to-speech model as a pronunciation model for learners.",
    "Delivery: use a clear General American accent, natural phrase groups, rising and falling intonation, and brief pauses at commas.",
    "Naturalness: emphasize stressed words, keep the delivery smooth and conversational, and do not read document symbols, Markdown markers, or headings as words.",
  ].join(" ");
  if (rate >= 1) return base;
  const pct = Math.round(rate * 100);
  return `${base} Teaching pace: speak slowly and deliberately, at about ${pct}% of normal speed.`;
}

export function mimoTtsBaseURL(baseURL: string): string {
  const trimmed = baseURL.replace(/\/+$/, "");
  const lower = trimmed.toLowerCase();
  if (lower.endsWith("/anthropic/v1/messages")) {
    return `${trimmed.slice(0, -"/anthropic/v1/messages".length)}/v1`;
  }
  if (lower.endsWith("/anthropic/v1")) {
    return `${trimmed.slice(0, -"/anthropic/v1".length)}/v1`;
  }
  if (lower.endsWith("/anthropic")) {
    return `${trimmed.slice(0, -"/anthropic".length)}/v1`;
  }
  return trimmed;
}
