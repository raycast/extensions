import { LocalStorage } from "@raycast/api";
import { DEFAULT_VOICE_ID } from "../constants/voices";
import { DEFAULT_MODEL as DEFAULT_MIMO_MODEL, DEFAULT_VOICE as DEFAULT_MIMO_VOICE } from "../constants/mimo-voices";
import { DEFAULT_FORMAT, DEFAULT_MODEL, DEFAULT_VOICE } from "../constants/openai-voices";
import type { MimoTTSModel } from "../api/mimo-types";
import type { OpenAITTSModel, OpenAIResponseFormat } from "../api/openai-types";
import type { TTSProvider } from "./provider";

const SETTINGS_KEY = "ai-voice-studio:provider-settings:v1";

export interface OpenAIProviderSettings {
  model: OpenAITTSModel;
  voice: string;
  responseFormat: OpenAIResponseFormat;
  playbackRate: string;
  instructions?: string;
}

export interface MiniMaxProviderSettings {
  model: string;
  defaultVoice: string;
  customDefaultVoice?: string;
  customVoiceIds?: string;
  languageBoost: string;
  speechRate: string;
}

export interface MimoProviderSettings {
  model: MimoTTSModel;
  defaultVoice: string;
  speechRate: string;
  stylePrompt?: string;
}

export interface ProviderSettings {
  defaultProvider: TTSProvider;
  minimax: MiniMaxProviderSettings;
  mimo: MimoProviderSettings;
  openai: OpenAIProviderSettings;
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  defaultProvider: "minimax",
  minimax: {
    model: "speech-2.8-hd",
    defaultVoice: DEFAULT_VOICE_ID,
    customDefaultVoice: "",
    customVoiceIds: "",
    languageBoost: "auto",
    speechRate: "1",
  },
  mimo: {
    model: DEFAULT_MIMO_MODEL,
    defaultVoice: DEFAULT_MIMO_VOICE,
    speechRate: "0",
    stylePrompt: "",
  },
  openai: {
    model: DEFAULT_MODEL,
    voice: DEFAULT_VOICE,
    responseFormat: DEFAULT_FORMAT,
    playbackRate: "1",
    instructions: "",
  },
};

export async function getProviderSettings(): Promise<ProviderSettings> {
  const raw = await LocalStorage.getItem<string>(SETTINGS_KEY);
  if (!raw) return DEFAULT_PROVIDER_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
    return normalizeSettings(parsed);
  } catch {
    return DEFAULT_PROVIDER_SETTINGS;
  }
}

export async function setProviderSettings(settings: ProviderSettings): Promise<void> {
  await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
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

function normalizeSettings(settings: Partial<ProviderSettings>): ProviderSettings {
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
    model: normalizeMiniMaxModel(settings?.model),
    defaultVoice: settings?.defaultVoice?.trim() || DEFAULT_VOICE_ID,
    customDefaultVoice: settings?.customDefaultVoice?.trim() || "",
    customVoiceIds: settings?.customVoiceIds?.trim() || "",
    languageBoost: normalizeLanguageBoost(settings?.languageBoost),
    speechRate: normalizePlaybackRate(settings?.speechRate),
  };
}

function normalizeMimoSettings(settings: Partial<MimoProviderSettings> | undefined): MimoProviderSettings {
  return {
    model: settings?.model === "mimo-v2-tts" ? "mimo-v2-tts" : DEFAULT_MIMO_MODEL,
    defaultVoice: settings?.defaultVoice?.trim() || DEFAULT_MIMO_VOICE,
    speechRate: normalizeMimoSpeechRate(settings?.speechRate),
    stylePrompt: settings?.stylePrompt?.trim() || "",
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

function normalizeMimoSpeechRate(rate: string | undefined): string {
  return ["-50", "-25", "0", "25", "50", "75", "100"].includes(rate ?? "") ? rate! : "0";
}
