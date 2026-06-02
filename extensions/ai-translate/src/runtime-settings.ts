import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getDefaultTTSModel, isTTSProvider, normalizeTTSModel } from "./tts-models";
import {
  ExtensionPreferences,
  ModelTier,
  PROVIDER_IDS,
  ProviderId,
  ProviderSelectionMode,
  PromptProfile,
  RuntimeSettings,
  TranslationStyle,
  TTSProvider,
} from "./types";

const STORAGE_KEY = "runtime-settings";

function getDefaults(): RuntimeSettings {
  try {
    const prefs = getPreferenceValues<ExtensionPreferences>();
    const ttsProvider = pickDefaultTTSProvider(prefs);
    return {
      modelTier: pickDefaultModelTier(prefs),
      providerMode: "enabled",
      selectedProviderId: isProviderId(prefs.defaultProvider) ? prefs.defaultProvider : "deepseek",
      modelOverrides: {},
      promptProfile: isPromptProfile(prefs.promptProfile) ? prefs.promptProfile : "general",
      translationStyle: isTranslationStyle(prefs.translationStyle) ? prefs.translationStyle : "balanced",
      customPromptInstructions: prefs.customPromptInstructions?.trim() ?? "",
      ttsProvider,
      ttsModel: getDefaultTTSModel(ttsProvider, prefs),
    };
  } catch {
    return {
      modelTier: "fast",
      providerMode: "enabled",
      selectedProviderId: "deepseek",
      modelOverrides: {},
      promptProfile: "general",
      translationStyle: "balanced",
      customPromptInstructions: "",
      ttsProvider: "qwen",
      ttsModel: getDefaultTTSModel("qwen"),
    };
  }
}

/**
 * Pick a TTS provider the user can actually use on first Read Aloud, so a
 * Gemini-only setup doesn't hit a "DashScope key required" failure before
 * they've ever opened Settings. Falls back to Qwen when both or
 * neither key is set (Qwen is the documented default).
 */
function pickDefaultTTSProvider(prefs: ExtensionPreferences): TTSProvider {
  const hasQwenKey = Boolean(prefs.dashscopeApiKey?.trim());
  const hasGeminiKey = Boolean(prefs.geminiAPIKey?.trim());
  if (!hasQwenKey && hasGeminiKey) return "gemini";
  return "qwen";
}

function pickDefaultModelTier(prefs: ExtensionPreferences): ModelTier {
  return isModelTier(prefs.defaultModelTier) ? prefs.defaultModelTier : "fast";
}

export async function loadRuntimeSettings(): Promise<RuntimeSettings> {
  const defaults = getDefaults();
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeSettings>;
    const ttsProvider = isTTSProvider(parsed.ttsProvider) ? parsed.ttsProvider : defaults.ttsProvider;
    const parsedModel = normalizeTTSModel(ttsProvider, parsed.ttsModel);
    return {
      modelTier: isModelTier(parsed.modelTier) ? parsed.modelTier : defaults.modelTier,
      providerMode: isProviderSelectionMode(parsed.providerMode) ? parsed.providerMode : defaults.providerMode,
      selectedProviderId: isProviderId(parsed.selectedProviderId)
        ? parsed.selectedProviderId
        : defaults.selectedProviderId,
      modelOverrides: sanitizeModelOverrides(parsed.modelOverrides),
      promptProfile: isPromptProfile(parsed.promptProfile) ? parsed.promptProfile : defaults.promptProfile,
      translationStyle: isTranslationStyle(parsed.translationStyle)
        ? parsed.translationStyle
        : defaults.translationStyle,
      customPromptInstructions:
        typeof parsed.customPromptInstructions === "string"
          ? parsed.customPromptInstructions
          : defaults.customPromptInstructions,
      ttsProvider,
      ttsModel: parsedModel || getDefaultTTSModel(ttsProvider, getPreferenceValues<ExtensionPreferences>()),
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

export async function updateRuntimeSettings(patch: Partial<RuntimeSettings>): Promise<RuntimeSettings> {
  const current = await loadRuntimeSettings();
  const updated = normalizeRuntimeSettings({ ...current, ...patch });
  await saveRuntimeSettings(updated);
  return updated;
}

export async function updateRuntimeSetting<K extends keyof RuntimeSettings>(
  key: K,
  value: RuntimeSettings[K],
): Promise<RuntimeSettings> {
  return updateRuntimeSettings({ [key]: value } as Partial<RuntimeSettings>);
}

function isModelTier(value: unknown): value is ModelTier {
  return value === "fast" || value === "pro" || value === "custom";
}

function isProviderSelectionMode(value: unknown): value is ProviderSelectionMode {
  return value === "enabled" || value === "single";
}

function isPromptProfile(value: unknown): value is PromptProfile {
  return ["screenshot", "general", "technical", "academic", "legal", "subtitle", "custom"].includes(value as string);
}

function isTranslationStyle(value: unknown): value is TranslationStyle {
  return ["balanced", "faithful", "polished", "academic"].includes(value as string);
}

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

function sanitizeModelOverrides(value: unknown): Partial<Record<ProviderId, string>> {
  if (!value || typeof value !== "object") return {};

  const overrides: Partial<Record<ProviderId, string>> = {};
  for (const id of PROVIDER_IDS) {
    const model = (value as Partial<Record<ProviderId, unknown>>)[id];
    if (typeof model === "string" && model.trim()) {
      overrides[id] = model.trim();
    }
  }
  return overrides;
}

function normalizeRuntimeSettings(settings: RuntimeSettings): RuntimeSettings {
  const ttsProvider = isTTSProvider(settings.ttsProvider) ? settings.ttsProvider : "qwen";
  const ttsModel = normalizeTTSModel(ttsProvider, settings.ttsModel) || getDefaultTTSModel(ttsProvider);

  return {
    ...settings,
    modelOverrides: sanitizeModelOverrides(settings.modelOverrides),
    providerMode: isProviderSelectionMode(settings.providerMode) ? settings.providerMode : "enabled",
    selectedProviderId: isProviderId(settings.selectedProviderId) ? settings.selectedProviderId : "deepseek",
    ttsProvider,
    ttsModel,
  };
}
