import { getPreferenceValues } from "@raycast/api";
import {
  DEFAULT_BASE_URL,
  DEFAULT_FORMAT,
  DEFAULT_LANGUAGE_TYPE,
  DEFAULT_MODEL,
  DEFAULT_VOICE,
  MODEL_LABELS,
  QWEN_LANGUAGE_TYPES,
  QWEN_MODELS,
  normalizeQwenBaseUrl,
  supportsInstructions,
  supportsOptimizeInstructions,
  getVoiceById,
  isVoiceAvailableForModel,
} from "../constants/qwen-tts-voices";
import { getSpeedOverride, parseRateString } from "../utils/qwen-playback-state";
import { getQwenSettings, type QwenProviderSettings } from "../utils/provider-settings";
import type { QwenTTSLanguageType, QwenTTSModel, TTSOptionOverrides, TTSOptions } from "./qwen-tts-types";

const REQUEST_TIMEOUT_MS = 90_000;

interface QwenTTSResponse {
  output?: {
    audio?: {
      data?: string;
      url?: string;
      id?: string;
      expires_at?: number;
    };
    finish_reason?: string;
  };
  code?: string | number;
  message?: string;
  request_id?: string;
}

export async function synthesizeSpeech(text: string, options: TTSOptions, signal?: AbortSignal): Promise<string> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text cannot be empty");
  }

  if (signal?.aborted) {
    throw new TTSApiError("TTS synthesis cancelled", -7);
  }

  const prefs = getPreferenceValues<Preferences>();
  const apiKey = prefs.dashscopeApiKey?.trim();
  if (!apiKey) {
    throw new TTSApiError("DashScope API key is required for Qwen-TTS. Add it in extension preferences.", -1);
  }

  const response = await postWithTimeout(
    buildSpeechSynthesizerUrl(options.baseUrl),
    buildRequest(trimmedText, options),
    apiKey,
    signal,
  );
  const audio = response.output?.audio;
  if (audio?.data) return audio.data;
  if (audio?.url) return fetchAudioUrl(audio.url, signal);

  throw new TTSApiError(`No audio data returned from Qwen-TTS (${options.voice}).`, -4);
}

function buildRequest(text: string, options: TTSOptions): Record<string, unknown> {
  const input: Record<string, unknown> = {
    text,
    voice: options.voice,
    language_type: options.languageType,
  };

  if (supportsInstructions(options.model) && options.instructions) {
    input.instructions = options.instructions;
    if (options.optimizeInstructions && supportsOptimizeInstructions(options.model)) {
      input.optimize_instructions = true;
    }
  }

  return {
    model: options.model,
    input,
  };
}

async function postWithTimeout(
  url: string,
  body: Record<string, unknown>,
  apiKey: string,
  signal?: AbortSignal,
): Promise<QwenTTSResponse> {
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

    if (data.code || data.message) {
      throw new TTSApiError(data.message || "Qwen-TTS request failed.", normalizeErrorCode(data.code));
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

async function fetchAudioUrl(url: string, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortHandler = () => controller.abort();
  signal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new TTSApiError(
        `Qwen-TTS audio download failed: HTTP ${response.status} ${response.statusText}`,
        response.status,
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new TTSApiError("Qwen-TTS returned an empty audio file.", -4);
    }
    return buffer.toString("base64");
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

function parseJson(text: string): QwenTTSResponse {
  try {
    return JSON.parse(text) as QwenTTSResponse;
  } catch {
    return { message: text || "Qwen-TTS returned a non-JSON response." };
  }
}

function formatApiError(data: QwenTTSResponse, status: number, statusText: string): string {
  return data.message || `Qwen-TTS request failed: HTTP ${status} ${statusText}`;
}

function normalizeErrorCode(code: string | number | undefined): number {
  if (typeof code === "number") return code;
  const parsed = Number(code);
  return Number.isFinite(parsed) ? parsed : -6;
}

function buildSpeechSynthesizerUrl(baseUrl: string | undefined): string {
  return `${normalizeBaseUrl(baseUrl)}/services/aigc/multimodal-generation/generation`;
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return normalizeQwenBaseUrl(baseUrl || DEFAULT_BASE_URL);
}

export function getActiveModel(): QwenTTSModel {
  return DEFAULT_MODEL;
}

export async function getActiveModelAsync(): Promise<QwenTTSModel> {
  const settings = await getQwenSettings();
  return normalizeModel(settings.model);
}

export function getModelLabel(model: QwenTTSModel): string {
  return MODEL_LABELS[model];
}

export async function buildOptionsFromPrefs(
  voiceOverride?: string,
  overrides: TTSOptionOverrides = {},
  speedOverrideRate?: number | null,
): Promise<TTSOptions> {
  const settings = await getQwenSettings();
  return buildOptionsFromSettings(settings, voiceOverride, overrides, speedOverrideRate);
}

function buildOptionsFromSettings(
  settings: QwenProviderSettings,
  voiceOverride?: string,
  overrides: TTSOptionOverrides = {},
  speedOverrideRate?: number | null,
): TTSOptions {
  const model = normalizeModel(settings.model);
  const voice = voiceOverride || settings.voice || DEFAULT_VOICE;
  const voiceConfig = getVoiceById(voice);

  if (!voiceConfig) {
    throw new TTSApiError(
      `Unknown voice "${voice}". Pick a Qwen-TTS voice in Setup Voice Defaults or Set Quick Read Voice.`,
      -1,
    );
  }

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
    region: settings.region,
    languageType: overrides.languageType ?? normalizeLanguageType(settings.languageType),
    baseUrl: normalizeBaseUrl(settings.baseUrl),
    playbackRate: rate,
    instructions: settings.instructions?.trim() || undefined,
    optimizeInstructions: settings.optimizeInstructions,
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

function normalizeModel(model: string | undefined): QwenTTSModel {
  return QWEN_MODELS.includes(model as QwenTTSModel) ? (model as QwenTTSModel) : DEFAULT_MODEL;
}

function normalizeLanguageType(languageType: string | undefined): QwenTTSLanguageType {
  return QWEN_LANGUAGE_TYPES.includes(languageType as QwenTTSLanguageType)
    ? (languageType as QwenTTSLanguageType)
    : DEFAULT_LANGUAGE_TYPE;
}

export class TTSApiError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "TTSApiError";
    this.code = code;
  }
}
