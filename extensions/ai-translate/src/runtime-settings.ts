import { getPreferenceValues, LocalStorage } from "@raycast/api";
import {
  ExtensionPreferences,
  ModelTier,
  PromptProfile,
  RuntimeSettings,
  TranslationStyle,
  TTSProvider,
} from "./types";

const STORAGE_KEY = "runtime-settings";

function getDefaults(): RuntimeSettings {
  try {
    const prefs = getPreferenceValues<ExtensionPreferences>();
    return {
      modelTier: "fast",
      promptProfile: isPromptProfile(prefs.promptProfile) ? prefs.promptProfile : "general",
      translationStyle: isTranslationStyle(prefs.translationStyle) ? prefs.translationStyle : "balanced",
      customPromptInstructions: prefs.customPromptInstructions?.trim() ?? "",
      ttsProvider: "qwen",
    };
  } catch {
    return {
      modelTier: "fast",
      promptProfile: "general",
      translationStyle: "balanced",
      customPromptInstructions: "",
      ttsProvider: "qwen",
    };
  }
}

export async function loadRuntimeSettings(): Promise<RuntimeSettings> {
  const defaults = getDefaults();
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeSettings>;
    return {
      modelTier: isModelTier(parsed.modelTier) ? parsed.modelTier : defaults.modelTier,
      promptProfile: isPromptProfile(parsed.promptProfile) ? parsed.promptProfile : defaults.promptProfile,
      translationStyle: isTranslationStyle(parsed.translationStyle)
        ? parsed.translationStyle
        : defaults.translationStyle,
      customPromptInstructions:
        typeof parsed.customPromptInstructions === "string"
          ? parsed.customPromptInstructions
          : defaults.customPromptInstructions,
      ttsProvider: isTTSProvider(parsed.ttsProvider) ? parsed.ttsProvider : defaults.ttsProvider,
    };
  } catch {
    return defaults;
  }
}

export function getDefaultRuntimeSettings(): RuntimeSettings {
  return getDefaults();
}

export async function saveRuntimeSettings(settings: RuntimeSettings): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function updateRuntimeSetting<K extends keyof RuntimeSettings>(
  key: K,
  value: RuntimeSettings[K],
): Promise<RuntimeSettings> {
  const current = await loadRuntimeSettings();
  const updated = { ...current, [key]: value };
  await saveRuntimeSettings(updated);
  return updated;
}

function isModelTier(value: unknown): value is ModelTier {
  return value === "fast" || value === "pro" || value === "custom";
}

function isPromptProfile(value: unknown): value is PromptProfile {
  return ["screenshot", "general", "technical", "academic", "legal", "subtitle", "custom"].includes(value as string);
}

function isTranslationStyle(value: unknown): value is TranslationStyle {
  return ["balanced", "faithful", "polished", "academic"].includes(value as string);
}

function isTTSProvider(value: unknown): value is TTSProvider {
  return value === "qwen" || value === "gemini";
}
