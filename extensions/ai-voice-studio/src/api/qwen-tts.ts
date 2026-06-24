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
import { resolvePlaybackRate, validateVoiceForModel } from "./provider-option-helpers";
import { prepareTTSInput, readNonEmptyAudioBase64, requestTTSWithTimeout, requirePreference } from "./shared-tts-api";
import { TTSApiError, normalizeErrorCode } from "./tts-api-error";
export { TTSApiError } from "./tts-api-error";

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
  const trimmedText = prepareTTSInput(text, signal);
  const prefs = getPreferenceValues<Preferences>();
  const apiKey = requirePreference(
    prefs,
    "dashscopeApiKey",
    "Qwen DashScope API key is required for Qwen-TTS. Add it in extension preferences.",
  );

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
  return requestTTSWithTimeout(signal, async (requestSignal) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: requestSignal,
    });

    const text = await response.text();
    const data = parseJson(text);

    if (!response.ok) {
      throw new TTSApiError(formatApiError(data, response.status, response.statusText), response.status);
    }

    if (data.code !== undefined || data.message) {
      throw new TTSApiError(data.message || "Qwen-TTS request failed.", normalizeErrorCode(data.code));
    }

    return data;
  });
}

async function fetchAudioUrl(url: string, signal?: AbortSignal): Promise<string> {
  return requestTTSWithTimeout(signal, async (requestSignal) => {
    const response = await fetch(url, { signal: requestSignal });
    return readNonEmptyAudioBase64(
      response,
      "Qwen-TTS returned an empty audio file.",
      "Qwen-TTS audio download failed",
    );
  });
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
  validateVoiceForModel({
    getVoiceById,
    isVoiceAvailableForModel,
    model,
    modelLabel: MODEL_LABELS[model],
    providerName: "Qwen-TTS",
    throwConfigError: (message) => {
      throw new TTSApiError(message, -1);
    },
    voice,
  });

  const rate = resolvePlaybackRate(speedOverrideRate, settings.playbackRate, parseRateString);

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
