import { LocalStorage } from "@raycast/api";
import { DEFAULT_FORMAT, DEFAULT_MODEL, DEFAULT_VOICE } from "../constants/openai-voices";
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

export interface ProviderSettings {
  defaultProvider: TTSProvider;
  openai: OpenAIProviderSettings;
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  defaultProvider: "minimax",
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

export async function getOpenAISettings(): Promise<OpenAIProviderSettings> {
  return (await getProviderSettings()).openai;
}

function normalizeSettings(settings: Partial<ProviderSettings>): ProviderSettings {
  return {
    defaultProvider: normalizeProvider(settings.defaultProvider),
    openai: normalizeOpenAISettings(settings.openai),
  };
}

function normalizeProvider(provider: string | undefined): TTSProvider {
  if (provider === "mimo" || provider === "openai") return provider;
  return "minimax";
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
