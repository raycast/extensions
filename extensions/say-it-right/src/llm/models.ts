export interface ModelOption {
  id: string;
  title: string;
}

export const PROVIDER_IDS = ["qwen", "mimo", "gemini", "openai"] as const;
export type ProviderName = (typeof PROVIDER_IDS)[number];

export const TTS_PROVIDER_IDS = ["qwen", "mimo", "gemini", "openai"] as const;
export type TtsProviderName = (typeof TTS_PROVIDER_IDS)[number];

export const DEFAULT_ANALYSIS_PROVIDER: ProviderName = "qwen";

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  qwen: "Qwen",
  mimo: "MiMo",
  gemini: "Gemini",
  openai: "OpenAI",
};

export const DEFAULT_ANALYSIS_MODELS: Record<ProviderName, string> = {
  qwen: "qwen3.6-flash",
  mimo: "mimo-v2.5",
  gemini: "gemini-3.5-flash",
  openai: "gpt-5.5",
};

export const ANALYSIS_MODELS: Record<ProviderName, readonly ModelOption[]> = {
  qwen: [
    { id: "qwen3.6-flash", title: "Qwen 3.6 Flash" },
    { id: "qwen3.7-plus", title: "Qwen 3.7 Plus" },
    { id: "qwen3.7-max", title: "Qwen 3.7 Max" },
  ],
  mimo: [
    { id: "mimo-v2.5", title: "V2.5" },
    { id: "mimo-v2.5-pro", title: "V2.5 Pro" },
  ],
  gemini: [
    { id: "gemini-3.5-flash", title: "Gemini 3.5 Flash" },
    { id: "gemini-3.1-pro-preview", title: "Gemini 3.1 Pro Preview" },
    { id: "gemini-3.1-flash-lite", title: "Gemini 3.1 Flash-Lite" },
    { id: "gemini-3-flash-preview", title: "Gemini 3 Flash Preview" },
  ],
  openai: [{ id: "gpt-5.5", title: "GPT-5.5" }],
};

export const DEFAULT_TTS_MODELS: Record<TtsProviderName, string> = {
  qwen: "qwen3-tts-flash",
  mimo: "mimo-v2.5-tts",
  gemini: "gemini-3.1-flash-tts-preview",
  openai: "gpt-4o-mini-tts",
};

export const TTS_MODELS: Record<TtsProviderName, readonly ModelOption[]> = {
  qwen: [
    { id: "qwen3-tts-flash", title: "Qwen3 TTS Flash" },
    { id: "qwen3-tts-instruct-flash", title: "Qwen3 TTS Instruct Flash" },
  ],
  mimo: [{ id: "mimo-v2.5-tts", title: "MiMo V2.5 TTS" }],
  gemini: [
    {
      id: "gemini-3.1-flash-tts-preview",
      title: "Gemini 3.1 Flash TTS Preview",
    },
  ],
  openai: [{ id: "gpt-4o-mini-tts", title: "GPT-4o Mini TTS" }],
};

export const DEFAULT_TTS_VOICES: Record<TtsProviderName, string> = {
  qwen: "Jennifer",
  mimo: "Chloe",
  gemini: "Charon",
  openai: "marin",
};

export const TTS_VOICES: Record<TtsProviderName, readonly ModelOption[]> = {
  qwen: [
    { id: "Jennifer", title: "Jennifer" },
    { id: "Aiden", title: "Aiden" },
    { id: "Neil", title: "Neil" },
    { id: "Elias", title: "Elias" },
    { id: "Cherry", title: "Cherry" },
    { id: "Katerina", title: "Katerina" },
    { id: "Ethan", title: "Ethan" },
    { id: "Ryan", title: "Ryan" },
    { id: "Nofish", title: "Nofish" },
  ],
  mimo: [
    { id: "Chloe", title: "Chloe - English Female" },
    { id: "Mia", title: "Mia - English Female" },
    { id: "Milo", title: "Milo - English Male" },
    { id: "Dean", title: "Dean - English Male" },
  ],
  gemini: [
    { id: "Charon", title: "Charon" },
    { id: "Iapetus", title: "Iapetus" },
    { id: "Sulafat", title: "Sulafat" },
    { id: "Puck", title: "Puck" },
  ],
  openai: [
    { id: "marin", title: "Marin" },
    { id: "cedar", title: "Cedar" },
    { id: "coral", title: "Coral" },
    { id: "alloy", title: "Alloy" },
    { id: "ash", title: "Ash" },
    { id: "ballad", title: "Ballad" },
    { id: "echo", title: "Echo" },
    { id: "fable", title: "Fable" },
    { id: "nova", title: "Nova" },
    { id: "onyx", title: "Onyx" },
    { id: "sage", title: "Sage" },
    { id: "shimmer", title: "Shimmer" },
    { id: "verse", title: "Verse" },
  ],
};

export function isProviderName(value: string): value is ProviderName {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export function isTtsProviderName(value: string): value is TtsProviderName {
  return (TTS_PROVIDER_IDS as readonly string[]).includes(value);
}

export function knownModelOrDefault(
  value: string | undefined,
  options: readonly ModelOption[],
  fallback: string,
): string {
  const trimmed = value?.trim() ?? "";
  return options.some((option) => option.id === trimmed) ? trimmed : fallback;
}

export const knownVoiceOrDefault = knownModelOrDefault;
