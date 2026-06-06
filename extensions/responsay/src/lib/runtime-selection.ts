import { LocalStorage } from "@raycast/api";
import {
  getAvailableAnalysisProviders,
  pickInitialProvider,
  resolveAnalysisModel,
  type ProviderName,
  type TtsProviderName,
} from "../llm/config";
import {
  ANALYSIS_MODELS,
  DEFAULT_TTS_MODELS,
  DEFAULT_TTS_VOICES,
  PROVIDER_IDS,
  TTS_MODELS,
  TTS_PROVIDER_IDS,
  TTS_VOICES,
  isProviderName,
  isTtsProviderName,
  knownModelOrDefault,
  knownVoiceOrDefault,
} from "../llm/models";
import type { TtsPrefs } from "../tts/types";

const STORAGE_KEY = "runtime-model-selection-v1";

export type TtsProviderChoice = "follow-analysis" | TtsProviderName;
export type AnalysisModelMap = Partial<Record<ProviderName, string>>;
export type TtsModelMap = Partial<Record<TtsProviderName, string>>;
export type TtsVoiceMap = Partial<Record<TtsProviderName, string>>;

export interface RuntimeSelection {
  analysisProvider?: ProviderName;
  analysisModels?: AnalysisModelMap;
  ttsProvider?: TtsProviderChoice;
  ttsModels?: TtsModelMap;
  ttsVoices?: TtsVoiceMap;
}

export async function readRuntimeSelection(): Promise<RuntimeSelection> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    return normalizeRuntimeSelection(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function writeRuntimeSelection(selection: RuntimeSelection): void {
  void LocalStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeRuntimeSelection(selection)),
  );
}

export function initialAnalysisProvider(
  prefs: TtsPrefs & { defaultAnalysisProvider?: ProviderName },
  stored: RuntimeSelection,
): ProviderName {
  const available = getAvailableAnalysisProviders(prefs);
  if (
    stored.analysisProvider &&
    (available.length === 0 || available.includes(stored.analysisProvider))
  ) {
    return stored.analysisProvider;
  }
  return pickInitialProvider(prefs);
}

export function initialAnalysisModels(
  prefs: TtsPrefs,
  stored: RuntimeSelection,
): AnalysisModelMap {
  return Object.fromEntries(
    PROVIDER_IDS.map((provider) => [
      provider,
      knownModelOrDefault(
        stored.analysisModels?.[provider],
        ANALYSIS_MODELS[provider],
        resolveAnalysisModel(provider, prefs),
      ),
    ]),
  ) as AnalysisModelMap;
}

export function initialTtsProviderChoice(
  prefs: TtsPrefs,
  stored: RuntimeSelection,
): TtsProviderChoice {
  const prefChoice = prefs.ttsProvider;
  if (stored.ttsProvider) return stored.ttsProvider;
  if (
    prefChoice === "follow-analysis" ||
    (prefChoice && isTtsProviderName(prefChoice))
  )
    return prefChoice;
  return "follow-analysis";
}

export function initialTtsModels(
  prefs: TtsPrefs,
  stored: RuntimeSelection,
): TtsModelMap {
  return Object.fromEntries(
    TTS_PROVIDER_IDS.map((provider) => [
      provider,
      knownModelOrDefault(
        stored.ttsModels?.[provider],
        TTS_MODELS[provider],
        defaultTtsModel(provider, prefs),
      ),
    ]),
  ) as TtsModelMap;
}

export function initialTtsVoices(
  prefs: TtsPrefs,
  stored: RuntimeSelection,
): TtsVoiceMap {
  return Object.fromEntries(
    TTS_PROVIDER_IDS.map((provider) => [
      provider,
      knownVoiceOrDefault(
        stored.ttsVoices?.[provider],
        TTS_VOICES[provider],
        defaultTtsVoice(provider, prefs),
      ),
    ]),
  ) as TtsVoiceMap;
}

export function applyAnalysisModel(
  prefs: TtsPrefs,
  provider: ProviderName,
  model: string,
): TtsPrefs {
  const next = { ...prefs };
  if (provider === "openai") next.openaiAnalysisModel = model;
  if (provider === "qwen") next.qwenAnalysisModel = model;
  if (provider === "gemini") next.geminiAnalysisModel = model;
  if (provider === "mimo") next.mimoAnalysisModel = model;
  return next;
}

export function applyTtsSelection(
  prefs: TtsPrefs,
  providerChoice: TtsProviderChoice,
  models: TtsModelMap,
  voices: TtsVoiceMap,
): TtsPrefs {
  return {
    ...prefs,
    ttsProvider: providerChoice,
    openaiTtsModel: models.openai ?? prefs.openaiTtsModel,
    openaiTtsVoice: voices.openai ?? prefs.openaiTtsVoice,
    qwenTtsModel: models.qwen ?? prefs.qwenTtsModel,
    qwenTtsVoice: voices.qwen ?? prefs.qwenTtsVoice,
    geminiTtsModel: models.gemini ?? prefs.geminiTtsModel,
    geminiTtsVoice: voices.gemini ?? prefs.geminiTtsVoice,
    mimoTtsModel: models.mimo ?? prefs.mimoTtsModel,
    mimoTtsVoice: voices.mimo ?? prefs.mimoTtsVoice,
  };
}

function defaultTtsModel(provider: TtsProviderName, prefs: TtsPrefs): string {
  if (provider === "openai") {
    return knownModelOrDefault(
      prefs.openaiTtsModel,
      TTS_MODELS.openai,
      DEFAULT_TTS_MODELS.openai,
    );
  }
  if (provider === "qwen") {
    return knownModelOrDefault(
      prefs.qwenTtsModel,
      TTS_MODELS.qwen,
      DEFAULT_TTS_MODELS.qwen,
    );
  }
  if (provider === "gemini") {
    return knownModelOrDefault(
      prefs.geminiTtsModel,
      TTS_MODELS.gemini,
      DEFAULT_TTS_MODELS.gemini,
    );
  }
  return knownModelOrDefault(
    prefs.mimoTtsModel,
    TTS_MODELS.mimo,
    DEFAULT_TTS_MODELS.mimo,
  );
}

export function defaultTtsVoice(
  provider: TtsProviderName,
  prefs: TtsPrefs,
): string {
  if (provider === "openai") {
    return knownVoiceOrDefault(
      prefs.openaiTtsVoice,
      TTS_VOICES.openai,
      DEFAULT_TTS_VOICES.openai,
    );
  }
  if (provider === "qwen") {
    return knownVoiceOrDefault(
      prefs.qwenTtsVoice,
      TTS_VOICES.qwen,
      DEFAULT_TTS_VOICES.qwen,
    );
  }
  if (provider === "gemini") {
    return knownVoiceOrDefault(
      prefs.geminiTtsVoice,
      TTS_VOICES.gemini,
      DEFAULT_TTS_VOICES.gemini,
    );
  }
  return knownVoiceOrDefault(
    prefs.mimoTtsVoice,
    TTS_VOICES.mimo,
    DEFAULT_TTS_VOICES.mimo,
  );
}

function normalizeRuntimeSelection(value: unknown): RuntimeSelection {
  if (!value || typeof value !== "object") return {};
  const data = value as RuntimeSelection;
  const analysisModels: AnalysisModelMap = {};
  const ttsModels: TtsModelMap = {};
  const ttsVoices: TtsVoiceMap = {};

  for (const provider of PROVIDER_IDS) {
    const model = data.analysisModels?.[provider];
    if (
      typeof model === "string" &&
      ANALYSIS_MODELS[provider].some((option) => option.id === model)
    ) {
      analysisModels[provider] = model;
    }
  }

  for (const provider of TTS_PROVIDER_IDS) {
    const model = data.ttsModels?.[provider];
    if (
      typeof model === "string" &&
      TTS_MODELS[provider].some((option) => option.id === model)
    ) {
      ttsModels[provider] = model;
    }

    const voice = data.ttsVoices?.[provider];
    if (
      typeof voice === "string" &&
      TTS_VOICES[provider].some((option) => option.id === voice)
    ) {
      ttsVoices[provider] = voice;
    }
  }

  return {
    analysisProvider:
      data.analysisProvider && isProviderName(data.analysisProvider)
        ? data.analysisProvider
        : undefined,
    analysisModels,
    ttsProvider:
      data.ttsProvider === "follow-analysis" ||
      (data.ttsProvider && isTtsProviderName(data.ttsProvider))
        ? data.ttsProvider
        : undefined,
    ttsModels,
    ttsVoices,
  };
}
