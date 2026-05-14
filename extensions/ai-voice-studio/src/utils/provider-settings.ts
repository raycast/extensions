import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { DEFAULT_VOICE_ID } from "../constants/voices";
import { DEFAULT_MODEL as DEFAULT_MIMO_MODEL, DEFAULT_VOICE as DEFAULT_MIMO_VOICE } from "../constants/mimo-voices";
import { DEFAULT_FORMAT, DEFAULT_MODEL, DEFAULT_VOICE } from "../constants/openai-voices";
import type { MiniMaxRegion } from "../api/types";
import type { MimoTTSModel } from "../api/mimo-types";
import type { OpenAITTSModel, OpenAIResponseFormat } from "../api/openai-types";
import type { TTSProvider } from "./provider";

export interface OpenAIProviderSettings {
  model: OpenAITTSModel;
  voice: string;
  responseFormat: OpenAIResponseFormat;
  playbackRate: string;
  instructions?: string;
}

export type MiniMaxAuthMode = "auto" | "token-plan" | "payg";

export interface MiniMaxProviderSettings {
  authMode: MiniMaxAuthMode;
  model: string;
  defaultVoice: string;
  customDefaultVoice?: string;
  customVoiceIds?: string;
  languageBoost: string;
  speechRate: string;
  region: MiniMaxRegion;
}

export interface MimoProviderSettings {
  model: MimoTTSModel;
  defaultVoice: string;
  speechRate: string;
  stylePrompt?: string;
  tokenPlanBaseUrl: string;
}

export interface ProviderSettings {
  defaultProvider: TTSProvider;
  minimax: MiniMaxProviderSettings;
  mimo: MimoProviderSettings;
  openai: OpenAIProviderSettings;
}

export interface ProviderSettingsInput {
  defaultProvider?: string;
  minimax?: Partial<MiniMaxProviderSettings>;
  mimo?: Partial<MimoProviderSettings>;
  openai?: Partial<OpenAIProviderSettings>;
}

export const QUICK_SETUP_OVERRIDES_KEY = "ai-voice-studio:quick-setup-overrides";

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  defaultProvider: "minimax",
  minimax: {
    authMode: "auto",
    model: "speech-2.8-hd",
    defaultVoice: DEFAULT_VOICE_ID,
    customDefaultVoice: "",
    customVoiceIds: "",
    languageBoost: "auto",
    speechRate: "1",
    region: "cn",
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
    instructions: "",
  },
};

interface ProviderPreferenceValues {
  defaultProvider?: string;
  authMode?: string;
  minimaxModel?: string;
  minimaxDefaultVoice?: string;
  minimaxCustomDefaultVoice?: string;
  minimaxCustomVoiceIds?: string;
  minimaxLanguageBoost?: string;
  minimaxSpeechRate?: string;
  region?: string;
  mimoModel?: string;
  mimoDefaultVoice?: string;
  mimoSpeechRate?: string;
  mimoStylePrompt?: string;
  mimoTokenPlanBaseUrl?: string;
  openaiModel?: string;
  openaiVoice?: string;
  openaiResponseFormat?: string;
  openaiPlaybackRate?: string;
  openaiInstructions?: string;
}

export async function getProviderSettings(): Promise<ProviderSettings> {
  const preferences = getProviderSettingsFromPreferences();
  const overrides = await getProviderSettingsOverrides();
  return overrides ? normalizeSettings(mergeSettings(preferences, overrides)) : preferences;
}

function getProviderSettingsFromPreferences(): ProviderSettings {
  const prefs = getPreferenceValues<ProviderPreferenceValues>();
  return normalizeSettings({
    defaultProvider: prefs.defaultProvider,
    minimax: {
      authMode: prefs.authMode as MiniMaxAuthMode | undefined,
      model: prefs.minimaxModel,
      defaultVoice: prefs.minimaxDefaultVoice,
      customDefaultVoice: prefs.minimaxCustomDefaultVoice,
      customVoiceIds: prefs.minimaxCustomVoiceIds,
      languageBoost: prefs.minimaxLanguageBoost,
      speechRate: prefs.minimaxSpeechRate,
      region: prefs.region as MiniMaxRegion | undefined,
    },
    mimo: {
      model: prefs.mimoModel as MimoTTSModel | undefined,
      defaultVoice: prefs.mimoDefaultVoice,
      speechRate: prefs.mimoSpeechRate,
      stylePrompt: prefs.mimoStylePrompt,
      tokenPlanBaseUrl: prefs.mimoTokenPlanBaseUrl,
    },
    openai: {
      model: prefs.openaiModel as OpenAITTSModel | undefined,
      voice: prefs.openaiVoice,
      responseFormat: prefs.openaiResponseFormat as OpenAIResponseFormat | undefined,
      playbackRate: prefs.openaiPlaybackRate,
      instructions: prefs.openaiInstructions,
    },
  });
}

export async function getDefaultProviderSetting(): Promise<TTSProvider> {
  return (await getProviderSettings()).defaultProvider;
}

export async function getMiniMaxSettings(): Promise<MiniMaxProviderSettings> {
  return (await getProviderSettings()).minimax;
}

export async function getMimoSettings(): Promise<MimoProviderSettings> {
  return (await getProviderSettings()).mimo;
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

function mergeSettings(base: ProviderSettings, overrides: ProviderSettingsInput): ProviderSettingsInput {
  return {
    defaultProvider: overrides.defaultProvider ?? base.defaultProvider,
    minimax: { ...base.minimax, ...overrides.minimax },
    mimo: { ...base.mimo, ...overrides.mimo },
    openai: { ...base.openai, ...overrides.openai },
  };
}

function normalizeSettings(settings: ProviderSettingsInput): ProviderSettings {
  return {
    defaultProvider: normalizeProvider(settings.defaultProvider),
    minimax: normalizeMiniMaxSettings(settings.minimax),
    mimo: normalizeMimoSettings(settings.mimo),
    openai: normalizeOpenAISettings(settings.openai),
  };
}

function normalizeProvider(provider: string | undefined): TTSProvider {
  if (provider === "mimo" || provider === "openai") return provider;
  return "minimax";
}

function normalizeMiniMaxSettings(settings: Partial<MiniMaxProviderSettings> | undefined): MiniMaxProviderSettings {
  return {
    authMode: normalizeMiniMaxAuthMode(settings?.authMode),
    model: normalizeMiniMaxModel(settings?.model),
    defaultVoice: settings?.defaultVoice?.trim() || DEFAULT_VOICE_ID,
    customDefaultVoice: settings?.customDefaultVoice?.trim() || "",
    customVoiceIds: settings?.customVoiceIds?.trim() || "",
    languageBoost: normalizeLanguageBoost(settings?.languageBoost),
    speechRate: normalizePlaybackRate(settings?.speechRate),
    region: normalizeMiniMaxRegion(settings?.region),
  };
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

function normalizeOpenAISettings(settings: Partial<OpenAIProviderSettings> | undefined): OpenAIProviderSettings {
  return {
    model: normalizeOpenAIModel(settings?.model),
    voice: settings?.voice?.trim() || DEFAULT_VOICE,
    responseFormat: settings?.responseFormat === "wav" ? "wav" : DEFAULT_FORMAT,
    playbackRate: normalizePlaybackRate(settings?.playbackRate),
    instructions: settings?.instructions?.trim() || "",
  };
}

function normalizeOpenAIModel(model: string | undefined): OpenAITTSModel {
  if (model === "tts-1" || model === "tts-1-hd" || model === "gpt-4o-mini-tts") return model;
  return DEFAULT_MODEL;
}

function normalizePlaybackRate(rate: string | undefined): string {
  return ["0.5", "0.75", "1", "1.25", "1.5", "1.75", "2"].includes(rate ?? "") ? rate! : "1";
}

function normalizeMiniMaxModel(model: string | undefined): string {
  return [
    "speech-2.8-hd",
    "speech-2.8-turbo",
    "speech-2.6-hd",
    "speech-2.6-turbo",
    "speech-02-hd",
    "speech-02-turbo",
  ].includes(model ?? "")
    ? model!
    : "speech-2.8-hd";
}

function normalizeLanguageBoost(languageBoost: string | undefined): string {
  return ["auto", "Chinese", "Chinese,Yue", "English", "Japanese", "Korean"].includes(languageBoost ?? "")
    ? languageBoost!
    : "auto";
}

function normalizeMiniMaxRegion(region: string | undefined): MiniMaxRegion {
  return region === "global" ? "global" : "cn";
}

function normalizeMiniMaxAuthMode(authMode: string | undefined): MiniMaxAuthMode {
  return authMode === "token-plan" || authMode === "payg" ? authMode : "auto";
}

function normalizeMimoSpeechRate(rate: string | undefined): string {
  return ["-50", "-25", "0", "25", "50", "75", "100"].includes(rate ?? "") ? rate! : "0";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
