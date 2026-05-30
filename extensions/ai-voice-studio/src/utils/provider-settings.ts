import { LocalStorage } from "@raycast/api";
import {
  DEFAULT_BASE_URL as DEFAULT_QWEN_BASE_URL,
  DEFAULT_LANGUAGE_TYPE as DEFAULT_QWEN_LANGUAGE_TYPE,
  DEFAULT_MODEL as DEFAULT_QWEN_MODEL,
  DEFAULT_OPTIMIZE_INSTRUCTIONS as DEFAULT_QWEN_OPTIMIZE_INSTRUCTIONS,
  DEFAULT_REGION as DEFAULT_QWEN_REGION,
  DEFAULT_VOICE as DEFAULT_QWEN_VOICE,
  QWEN_LANGUAGE_TYPES,
  QWEN_MODELS,
  QWEN_REGIONS,
  getQwenRegionBaseUrl,
  getVoicesForModel as getQwenVoicesForModel,
  inferQwenRegion,
  normalizeQwenBaseUrl,
} from "../constants/qwen-tts-voices";
import { DEFAULT_MODEL as DEFAULT_MIMO_MODEL, DEFAULT_VOICE as DEFAULT_MIMO_VOICE } from "../constants/mimo-voices";
import {
  DEFAULT_BASE_URL as DEFAULT_MINIMAX_BASE_URL,
  DEFAULT_ENGLISH_NORMALIZATION as DEFAULT_MINIMAX_ENGLISH_NORMALIZATION,
  DEFAULT_LANGUAGE_BOOST as DEFAULT_MINIMAX_LANGUAGE_BOOST,
  DEFAULT_MODEL as DEFAULT_MINIMAX_MODEL,
  DEFAULT_VOICE as DEFAULT_MINIMAX_VOICE,
  MINIMAX_LANGUAGE_BOOSTS,
  MINIMAX_MODELS,
  normalizeMinimaxBaseUrl,
} from "../constants/minimax-voices";
import { DEFAULT_FORMAT, DEFAULT_MODEL, DEFAULT_VOICE } from "../constants/openai-voices";
import {
  DEFAULT_TONE,
  DEFAULT_EXPRESSIVENESS,
  DEFAULT_DELIVERY,
  DEFAULT_ACCENT_FOCUS,
  normalizeTone,
  normalizeExpressiveness,
  normalizeDelivery,
  normalizeAccentFocus,
} from "../constants/openai-style";
import type { MimoTTSModel } from "../api/mimo-types";
import type { MinimaxLanguageBoost, MinimaxTTSModel } from "../api/minimax-tts-types";
import type {
  OpenAITTSModel,
  OpenAIResponseFormat,
  OpenAITone,
  OpenAIExpressiveness,
  OpenAIDelivery,
  OpenAIAccentFocus,
} from "../api/openai-types";
import type { QwenTTSLanguageType, QwenTTSModel, QwenTTSRegion } from "../api/qwen-tts-types";
import type { TTSProvider } from "./provider";

export interface OpenAIProviderSettings {
  model: OpenAITTSModel;
  voice: string;
  responseFormat: OpenAIResponseFormat;
  playbackRate: string;
  tone: OpenAITone;
  expressiveness: OpenAIExpressiveness;
  delivery: OpenAIDelivery;
  accentFocus: OpenAIAccentFocus;
  instructions?: string;
}

export interface MimoProviderSettings {
  model: MimoTTSModel;
  defaultVoice: string;
  speechRate: string;
  stylePrompt?: string;
  tokenPlanBaseUrl: string;
}

export interface MinimaxProviderSettings {
  model: MinimaxTTSModel;
  voice: string;
  languageBoost: MinimaxLanguageBoost;
  playbackRate: string;
  englishNormalization: boolean;
  emotion?: string;
  baseUrl: string;
}

export interface QwenProviderSettings {
  model: QwenTTSModel;
  voice: string;
  region: QwenTTSRegion;
  languageType: QwenTTSLanguageType;
  playbackRate: string;
  instructions?: string;
  optimizeInstructions: boolean;
  baseUrl: string;
}

export interface ProviderSettings {
  defaultProvider: TTSProvider;
  qwen: QwenProviderSettings;
  minimax: MinimaxProviderSettings;
  mimo: MimoProviderSettings;
  openai: OpenAIProviderSettings;
}

export interface ProviderSettingsInput {
  defaultProvider?: string;
  qwen?: Partial<QwenProviderSettings>;
  minimax?: Partial<MinimaxProviderSettings>;
  mimo?: Partial<MimoProviderSettings>;
  openai?: Partial<OpenAIProviderSettings>;
}

export const QUICK_SETUP_OVERRIDES_KEY = "ai-voice-studio:quick-setup-overrides";

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  defaultProvider: "qwen",
  qwen: {
    model: DEFAULT_QWEN_MODEL,
    voice: DEFAULT_QWEN_VOICE,
    region: DEFAULT_QWEN_REGION,
    languageType: DEFAULT_QWEN_LANGUAGE_TYPE,
    playbackRate: "1",
    instructions: "",
    optimizeInstructions: DEFAULT_QWEN_OPTIMIZE_INSTRUCTIONS,
    baseUrl: DEFAULT_QWEN_BASE_URL,
  },
  minimax: {
    model: DEFAULT_MINIMAX_MODEL,
    voice: DEFAULT_MINIMAX_VOICE,
    languageBoost: DEFAULT_MINIMAX_LANGUAGE_BOOST,
    playbackRate: "1",
    englishNormalization: DEFAULT_MINIMAX_ENGLISH_NORMALIZATION,
    emotion: "",
    baseUrl: DEFAULT_MINIMAX_BASE_URL,
  },
  mimo: {
    model: DEFAULT_MIMO_MODEL,
    defaultVoice: DEFAULT_MIMO_VOICE,
    speechRate: "0",
    stylePrompt: "",
    tokenPlanBaseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
  },
  openai: {
    model: DEFAULT_MODEL,
    voice: DEFAULT_VOICE,
    responseFormat: DEFAULT_FORMAT,
    playbackRate: "1",
    tone: DEFAULT_TONE,
    expressiveness: DEFAULT_EXPRESSIVENESS,
    delivery: DEFAULT_DELIVERY,
    accentFocus: DEFAULT_ACCENT_FOCUS,
    instructions: "",
  },
};

export async function getProviderSettings(): Promise<ProviderSettings> {
  const overrides = await getProviderSettingsOverrides();
  return overrides ? normalizeSettings(mergeSettings(DEFAULT_PROVIDER_SETTINGS, overrides)) : DEFAULT_PROVIDER_SETTINGS;
}

export async function getDefaultProviderSetting(): Promise<TTSProvider> {
  return (await getProviderSettings()).defaultProvider;
}

export async function getQwenSettings(): Promise<QwenProviderSettings> {
  return (await getProviderSettings()).qwen;
}

export async function getMimoSettings(): Promise<MimoProviderSettings> {
  return (await getProviderSettings()).mimo;
}

export async function getMinimaxSettings(): Promise<MinimaxProviderSettings> {
  return (await getProviderSettings()).minimax;
}

export async function getOpenAISettings(): Promise<OpenAIProviderSettings> {
  return (await getProviderSettings()).openai;
}

export async function getProviderSettingsOverrides(): Promise<ProviderSettingsInput | null> {
  const raw = await LocalStorage.getItem<string>(QUICK_SETUP_OVERRIDES_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    return parsed as ProviderSettingsInput;
  } catch {
    await LocalStorage.removeItem(QUICK_SETUP_OVERRIDES_KEY);
    return null;
  }
}

export async function saveProviderSettingsOverrides(settings: ProviderSettingsInput): Promise<ProviderSettings> {
  const normalized = normalizeSettings(settings);
  await LocalStorage.setItem(QUICK_SETUP_OVERRIDES_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function clearProviderSettingsOverrides(): Promise<void> {
  await LocalStorage.removeItem(QUICK_SETUP_OVERRIDES_KEY);
}

/**
 * Persist the active Qwen model. Keeps the configured default voice valid for the new model
 * (falls back to the first available voice), mirroring the Setup Voice Defaults form so other
 * commands never inherit a voice the model cannot synthesize. Returns the saved Qwen settings.
 */
export async function setActiveQwenModel(nextModel: QwenTTSModel): Promise<QwenProviderSettings> {
  const settings = await getProviderSettings();
  const nextVoices = getQwenVoicesForModel(nextModel);
  const nextVoice = nextVoices.some((voice) => voice.id === settings.qwen.voice)
    ? settings.qwen.voice
    : (nextVoices[0]?.id ?? DEFAULT_QWEN_VOICE);
  const saved = await saveProviderSettingsOverrides({
    ...settings,
    qwen: { ...settings.qwen, model: nextModel, voice: nextVoice },
  });
  return saved.qwen;
}

function mergeSettings(base: ProviderSettings, overrides: ProviderSettingsInput): ProviderSettingsInput {
  return {
    defaultProvider: overrides.defaultProvider ?? base.defaultProvider,
    qwen: { ...base.qwen, ...overrides.qwen },
    minimax: { ...base.minimax, ...overrides.minimax },
    mimo: { ...base.mimo, ...overrides.mimo },
    openai: { ...base.openai, ...overrides.openai },
  };
}

function normalizeSettings(settings: ProviderSettingsInput): ProviderSettings {
  return {
    defaultProvider: normalizeProvider(settings.defaultProvider),
    qwen: normalizeQwenSettings(settings.qwen),
    minimax: normalizeMinimaxSettings(settings.minimax),
    mimo: normalizeMimoSettings(settings.mimo),
    openai: normalizeOpenAISettings(settings.openai),
  };
}

function normalizeProvider(provider: string | undefined): TTSProvider {
  if (provider === "qwen" || provider === "minimax" || provider === "mimo" || provider === "openai") return provider;
  return "qwen";
}

function normalizeMinimaxSettings(settings: Partial<MinimaxProviderSettings> | undefined): MinimaxProviderSettings {
  return {
    model: normalizeMinimaxModel(settings?.model),
    voice: settings?.voice?.trim() || DEFAULT_MINIMAX_VOICE,
    languageBoost: normalizeMinimaxLanguageBoost(settings?.languageBoost),
    playbackRate: normalizePlaybackRate(settings?.playbackRate),
    englishNormalization: normalizeBoolean(settings?.englishNormalization, DEFAULT_MINIMAX_ENGLISH_NORMALIZATION),
    emotion: settings?.emotion?.trim() || "",
    baseUrl: normalizeMinimaxBaseUrl(settings?.baseUrl),
  };
}

function normalizeMinimaxModel(model: string | undefined): MinimaxTTSModel {
  return MINIMAX_MODELS.includes(model as MinimaxTTSModel) ? (model as MinimaxTTSModel) : DEFAULT_MINIMAX_MODEL;
}

function normalizeMinimaxLanguageBoost(value: string | undefined): MinimaxLanguageBoost {
  return MINIMAX_LANGUAGE_BOOSTS.includes(value as MinimaxLanguageBoost)
    ? (value as MinimaxLanguageBoost)
    : DEFAULT_MINIMAX_LANGUAGE_BOOST;
}

function normalizeMimoSettings(settings: Partial<MimoProviderSettings> | undefined): MimoProviderSettings {
  return {
    model: settings?.model === "mimo-v2-tts" ? "mimo-v2-tts" : DEFAULT_MIMO_MODEL,
    defaultVoice: settings?.defaultVoice?.trim() || DEFAULT_MIMO_VOICE,
    speechRate: normalizeMimoSpeechRate(settings?.speechRate),
    stylePrompt: settings?.stylePrompt?.trim() || "",
    tokenPlanBaseUrl:
      settings?.tokenPlanBaseUrl
        ?.trim()
        .replace(/\/+$/, "")
        .replace(/\/chat\/completions$/, "") || DEFAULT_PROVIDER_SETTINGS.mimo.tokenPlanBaseUrl,
  };
}

function normalizeQwenSettings(settings: Partial<QwenProviderSettings> | undefined): QwenProviderSettings {
  const region = normalizeQwenRegion(settings?.region, settings?.baseUrl);
  return {
    model: normalizeQwenModel(settings?.model),
    voice: settings?.voice?.trim() || DEFAULT_QWEN_VOICE,
    region,
    languageType: normalizeQwenLanguageType(settings?.languageType),
    playbackRate: normalizePlaybackRate(settings?.playbackRate),
    instructions: settings?.instructions?.trim() || "",
    optimizeInstructions: normalizeBoolean(settings?.optimizeInstructions, DEFAULT_QWEN_OPTIMIZE_INSTRUCTIONS),
    baseUrl: normalizeQwenBaseUrlForRegion(settings?.baseUrl, region),
  };
}

function normalizeOpenAISettings(settings: Partial<OpenAIProviderSettings> | undefined): OpenAIProviderSettings {
  return {
    model: normalizeOpenAIModel(settings?.model),
    voice: settings?.voice?.trim() || DEFAULT_VOICE,
    responseFormat: normalizeOpenAIFormat(settings?.responseFormat),
    playbackRate: normalizePlaybackRate(settings?.playbackRate),
    tone: normalizeTone(settings?.tone),
    expressiveness: normalizeExpressiveness(settings?.expressiveness),
    delivery: normalizeDelivery(settings?.delivery),
    accentFocus: normalizeAccentFocus(settings?.accentFocus),
    instructions: settings?.instructions?.trim() || "",
  };
}

function normalizeOpenAIModel(model: string | undefined): OpenAITTSModel {
  return model === "gpt-4o-mini-tts" ? model : DEFAULT_MODEL;
}

function normalizeQwenModel(model: string | undefined): QwenTTSModel {
  return QWEN_MODELS.includes(model as QwenTTSModel) ? (model as QwenTTSModel) : DEFAULT_QWEN_MODEL;
}

function normalizeQwenLanguageType(languageType: string | undefined): QwenTTSLanguageType {
  return QWEN_LANGUAGE_TYPES.includes(languageType as QwenTTSLanguageType)
    ? (languageType as QwenTTSLanguageType)
    : DEFAULT_QWEN_LANGUAGE_TYPE;
}

function normalizeQwenRegion(region: string | undefined, baseUrl: string | undefined): QwenTTSRegion {
  if (QWEN_REGIONS.includes(region as QwenTTSRegion)) return region as QwenTTSRegion;
  return inferQwenRegion(baseUrl);
}

function normalizeQwenBaseUrlForRegion(baseUrl: string | undefined, region: QwenTTSRegion): string {
  if (region === "custom") return normalizeQwenBaseUrl(baseUrl);
  return getQwenRegionBaseUrl(region);
}

const VALID_OPENAI_FORMATS: readonly string[] = ["mp3", "wav", "opus", "aac", "flac"];

function normalizeOpenAIFormat(format: string | undefined): OpenAIResponseFormat {
  return VALID_OPENAI_FORMATS.includes(format ?? "") ? (format as OpenAIResponseFormat) : DEFAULT_FORMAT;
}

function normalizePlaybackRate(rate: string | undefined): string {
  return ["0.5", "0.75", "1", "1.25", "1.5", "1.75", "2"].includes(rate ?? "") ? rate! : "1";
}

function normalizeMimoSpeechRate(rate: string | undefined): string {
  return ["-50", "-25", "0", "25", "50", "75", "100"].includes(rate ?? "") ? rate! : "0";
}

function normalizeBoolean(value: boolean | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
