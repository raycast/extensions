import { ExtensionPreferences, TTSProvider } from "./types";

export interface TTSModelEntry {
  id: string;
  title: string;
}

export const TTS_PROVIDER_LABELS: Record<TTSProvider, string> = {
  qwen: "Qwen-TTS",
  gemini: "Gemini TTS",
};

export const QWEN_TTS_DEFAULT_MODEL = "qwen3-tts-flash";
export const QWEN_TTS_INSTRUCT_MODEL = "qwen3-tts-instruct-flash";
export const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

const TTS_MODEL_CATALOG: Record<TTSProvider, TTSModelEntry[]> = {
  qwen: [
    { id: QWEN_TTS_DEFAULT_MODEL, title: "Qwen3 TTS Flash" },
    { id: QWEN_TTS_INSTRUCT_MODEL, title: "Qwen3 TTS Instruct Flash" },
  ],
  gemini: [{ id: GEMINI_TTS_MODEL, title: "Gemini 3.1 Flash TTS Preview" }],
};

export function getTTSModelOptions(provider: TTSProvider): TTSModelEntry[] {
  return TTS_MODEL_CATALOG[provider];
}

export function getDefaultTTSModel(provider: TTSProvider, preferences?: ExtensionPreferences): string {
  if (provider === "qwen") {
    return normalizeTTSModel(provider, preferences?.qwenTTSModel);
  }
  return GEMINI_TTS_MODEL;
}

export function resolveTTSModel(
  provider: TTSProvider,
  runtimeModel: string | undefined,
  preferences?: ExtensionPreferences,
): string {
  const model = normalizeTTSModel(provider, runtimeModel);
  return model || getDefaultTTSModel(provider, preferences);
}

export function getTTSModelTitle(provider: TTSProvider, modelId: string | undefined): string {
  const resolved = normalizeTTSModel(provider, modelId) || getDefaultTTSModel(provider);
  const model = TTS_MODEL_CATALOG[provider].find((entry) => entry.id === resolved);
  return model ? `${model.title} (${model.id})` : resolved;
}

export function isTTSProvider(value: unknown): value is TTSProvider {
  return value === "qwen" || value === "gemini";
}

export function normalizeTTSModel(provider: TTSProvider, model: string | undefined): string {
  const trimmed = model?.trim();
  if (!trimmed) return "";
  return TTS_MODEL_CATALOG[provider].some((entry) => entry.id === trimmed) ? trimmed : "";
}
