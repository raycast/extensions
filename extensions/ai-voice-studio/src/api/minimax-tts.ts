import { getPreferenceValues } from "@raycast/api";
import {
  DEFAULT_BITRATE,
  DEFAULT_CHANNEL,
  DEFAULT_ENGLISH_NORMALIZATION,
  DEFAULT_FORMAT,
  DEFAULT_LANGUAGE_BOOST,
  DEFAULT_MODEL,
  DEFAULT_PITCH,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_VOICE,
  DEFAULT_VOLUME,
  MINIMAX_MODELS,
  MODEL_LABELS,
  getVoiceById,
  isVoiceAvailableForModel,
  normalizeMinimaxBaseUrl,
} from "../constants/minimax-voices";
import { getSpeedOverride, parseRateString } from "../utils/minimax-playback-state";
import { getMinimaxSettings, type MinimaxProviderSettings } from "../utils/provider-settings";
import type { MinimaxTTSModel, TTSOptionOverrides, TTSOptions } from "./minimax-tts-types";

const REQUEST_TIMEOUT_MS = 90_000;

interface MinimaxTTSResponse {
  data?: {
    audio?: string;
    status?: number;
  };
  extra_info?: {
    audio_format?: string;
    audio_sample_rate?: number;
    audio_size?: number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
  trace_id?: string;
}

export async function synthesizeSpeech(text: string, options: TTSOptions, signal?: AbortSignal): Promise<string> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text cannot be empty");
  }

  if (signal?.aborted) {
    throw new TTSApiError("TTS synthesis cancelled", -7);
  }

  const apiKey = getPreferenceValues<Preferences>().minimaxApiKey?.trim();
  if (!apiKey) {
    throw new TTSApiError("MiniMax API key is required. Add it in extension preferences.", -1);
  }

  const response = await postWithTimeout(
    buildSyncUrl(options.baseUrl),
    buildRequest(trimmedText, options),
    apiKey,
    signal,
  );
  const hex = response.data?.audio;
  if (!hex) {
    throw new TTSApiError(`No audio data returned from MiniMax (${options.voice}).`, -4);
  }
  return Buffer.from(hex, "hex").toString("base64");
}

function buildRequest(text: string, options: TTSOptions): Record<string, unknown> {
  const voiceSetting: Record<string, unknown> = {
    voice_id: options.voice,
    speed: options.playbackRate,
    vol: options.volume,
    pitch: options.pitch,
    english_normalization: options.englishNormalization,
  };
  if (options.emotion) voiceSetting.emotion = options.emotion;

  const body: Record<string, unknown> = {
    model: options.model,
    text,
    stream: false,
    voice_setting: voiceSetting,
    audio_setting: {
      sample_rate: options.sampleRate,
      bitrate: options.bitrate,
      format: options.format,
      channel: options.channel,
    },
  };

  if (options.languageBoost && options.languageBoost !== "auto") {
    body.language_boost = options.languageBoost;
  }

  return body;
}

async function postWithTimeout(
  url: string,
  body: Record<string, unknown>,
  apiKey: string,
  signal?: AbortSignal,
): Promise<MinimaxTTSResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortHandler = () => controller.abort();
  signal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const data = parseJson(text);

    if (!response.ok) {
      throw new TTSApiError(formatApiError(data, response.status, response.statusText), response.status);
    }

    const status = data.base_resp?.status_code;
    if (status !== undefined && status !== 0) {
      throw new TTSApiError(data.base_resp?.status_msg || "MiniMax TTS request failed.", status);
    }

    return data;
  } catch (error) {
    if (error instanceof TTSApiError) throw error;
    if (signal?.aborted) {
      throw new TTSApiError("TTS synthesis cancelled", -7);
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new TTSApiError(`Request timeout after ${REQUEST_TIMEOUT_MS / 1000} seconds`, -2);
    }
    throw new TTSApiError(error instanceof Error ? error.message : String(error), -6);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortHandler);
  }
}

function parseJson(text: string): MinimaxTTSResponse {
  try {
    return JSON.parse(text) as MinimaxTTSResponse;
  } catch {
    return { base_resp: { status_msg: text || "MiniMax TTS returned a non-JSON response." } };
  }
}

function formatApiError(data: MinimaxTTSResponse, status: number, statusText: string): string {
  return data.base_resp?.status_msg || `MiniMax TTS request failed: HTTP ${status} ${statusText}`;
}

function buildSyncUrl(baseUrl: string | undefined): string {
  return `${normalizeMinimaxBaseUrl(baseUrl)}/v1/t2a_v2`;
}

export function getActiveModel(): MinimaxTTSModel {
  return DEFAULT_MODEL;
}

export async function getActiveModelAsync(): Promise<MinimaxTTSModel> {
  const settings = await getMinimaxSettings();
  return normalizeModel(settings.model);
}

export function getModelLabel(model: MinimaxTTSModel): string {
  return MODEL_LABELS[model];
}

export async function buildOptionsFromPrefs(
  voiceOverride?: string,
  overrides: TTSOptionOverrides = {},
  speedOverrideRate?: number | null,
): Promise<TTSOptions> {
  const settings = await getMinimaxSettings();
  return buildOptionsFromSettings(settings, voiceOverride, overrides, speedOverrideRate);
}

function buildOptionsFromSettings(
  settings: MinimaxProviderSettings,
  voiceOverride?: string,
  overrides: TTSOptionOverrides = {},
  speedOverrideRate?: number | null,
): TTSOptions {
  const model = normalizeModel(settings.model);
  const voice = voiceOverride || settings.voice || DEFAULT_VOICE;
  const voiceConfig = getVoiceById(voice);

  if (voiceConfig && !isVoiceAvailableForModel(voiceConfig, model)) {
    throw new TTSApiError(
      `${voiceConfig.name} is not available for ${MODEL_LABELS[model]}. Change the model or choose another voice.`,
      -1,
    );
  }

  const rate = typeof speedOverrideRate === "number" ? speedOverrideRate : parseRateString(settings.playbackRate);

  return {
    model,
    voice,
    format: DEFAULT_FORMAT,
    playbackRate: rate,
    volume: DEFAULT_VOLUME,
    pitch: DEFAULT_PITCH,
    sampleRate: DEFAULT_SAMPLE_RATE,
    bitrate: DEFAULT_BITRATE,
    channel: DEFAULT_CHANNEL,
    languageBoost: overrides.languageBoost ?? settings.languageBoost,
    englishNormalization: settings.englishNormalization ?? DEFAULT_ENGLISH_NORMALIZATION,
    emotion: overrides.emotion ?? settings.emotion ?? undefined,
    baseUrl: normalizeMinimaxBaseUrl(settings.baseUrl),
  };
}

export async function buildOptionsAsync(
  voiceOverride?: string,
  overrides: TTSOptionOverrides = {},
): Promise<TTSOptions> {
  const speedOverride = await getSpeedOverride();
  return buildOptionsFromPrefs(voiceOverride, overrides, speedOverride);
}

export async function validateOptions(voiceOverride?: string): Promise<TTSOptions> {
  return buildOptionsFromPrefs(voiceOverride);
}

function normalizeModel(model: string | undefined): MinimaxTTSModel {
  return MINIMAX_MODELS.includes(model as MinimaxTTSModel) ? (model as MinimaxTTSModel) : DEFAULT_MODEL;
}

export function normalizeLanguageBoost(languageBoost: string | undefined): TTSOptions["languageBoost"] {
  if (!languageBoost) return DEFAULT_LANGUAGE_BOOST;
  const candidate = languageBoost as TTSOptions["languageBoost"];
  return candidate;
}

export class TTSApiError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "TTSApiError";
    this.code = code;
  }
}
