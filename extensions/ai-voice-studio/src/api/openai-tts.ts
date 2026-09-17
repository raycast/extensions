import { getPreferenceValues } from "@raycast/api";
import {
  DEFAULT_FORMAT,
  DEFAULT_MODEL,
  DEFAULT_VOICE,
  MODEL_LABELS,
  getVoiceById,
  isVoiceAvailableForModel,
} from "../constants/openai-voices";
import { composeStyleInstruction } from "../constants/openai-style";
import { getSpeedOverride, parseRateString, rateToInstruction } from "../utils/openai-playback-state";
import { getOpenAISettings, type OpenAIProviderSettings } from "../utils/provider-settings";
import type { OpenAITTSModel, OpenAIResponseFormat, TTSOptionOverrides, TTSOptions } from "./openai-types";
import { resolvePlaybackRate, validateVoiceForModel } from "./provider-option-helpers";
import { prepareTTSInput, readNonEmptyAudioBase64, requestTTSWithTimeout, requirePreference } from "./shared-tts-api";
import { TTSApiError } from "./tts-api-error";
export { TTSApiError } from "./tts-api-error";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

interface OpenAIErrorResponse {
  error?: {
    message?: string;
    code?: string | number;
    type?: string;
  };
}

export async function synthesizeSpeech(text: string, options: TTSOptions, signal?: AbortSignal): Promise<string> {
  const trimmedText = prepareTTSInput(text, signal);
  const prefs = getPreferenceValues<Preferences>();
  const apiKey = requirePreference(
    prefs,
    "openaiApiKey",
    "OpenAI API key is required. Add it in extension preferences.",
  );

  return postWithTimeout(
    `${DEFAULT_BASE_URL}/audio/speech`,
    {
      model: options.model,
      input: trimmedText,
      voice: options.voice,
      response_format: options.format,
      ...(supportsInstructions(options.model) && options.instructions ? { instructions: options.instructions } : {}),
    },
    apiKey,
    signal,
  );
}

async function postWithTimeout(
  url: string,
  body: Record<string, unknown>,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string> {
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

    if (!response.ok) {
      throw new TTSApiError(await readErrorDetail(response), response.status);
    }

    return readNonEmptyAudioBase64(response, "OpenAI TTS returned an empty audio file.", "OpenAI TTS request failed");
  });
}

async function readErrorDetail(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return `OpenAI TTS request failed: HTTP ${response.status} ${response.statusText}`;

  try {
    const parsed = JSON.parse(text) as OpenAIErrorResponse;
    return parsed.error?.message || text;
  } catch {
    return text;
  }
}

export function getActiveModel(): OpenAITTSModel {
  return DEFAULT_MODEL;
}

export async function getActiveModelAsync(): Promise<OpenAITTSModel> {
  const settings = await getOpenAISettings();
  return normalizeModel(settings.model);
}

export function getModelLabel(model: OpenAITTSModel): string {
  return MODEL_LABELS[model];
}

export async function buildOptionsFromPrefs(
  voiceOverride?: string,
  overrides: TTSOptionOverrides = {},
  speedOverrideRate?: number | null,
): Promise<TTSOptions> {
  const settings = await getOpenAISettings();
  return buildOptionsFromSettings(settings, voiceOverride, overrides, speedOverrideRate);
}

function buildOptionsFromSettings(
  settings: OpenAIProviderSettings,
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
    providerName: "OpenAI",
    throwConfigError: (message) => {
      throw new TTSApiError(message, -1);
    },
    voice,
  });

  const rate = resolvePlaybackRate(speedOverrideRate, settings.playbackRate || String(SPEED_DEFAULT), parseRateString);

  return {
    model,
    voice,
    instructions: buildInstructions(settings, overrides.instructions, rate),
    format: normalizeFormat(settings.responseFormat),
    playbackRate: rate,
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

function normalizeModel(model: string | undefined): OpenAITTSModel {
  return model === "gpt-4o-mini-tts" ? model : DEFAULT_MODEL;
}

const VALID_FORMATS: readonly string[] = ["mp3", "wav", "opus", "aac", "flac"];

function normalizeFormat(format: string | undefined): OpenAIResponseFormat {
  return VALID_FORMATS.includes(format ?? "") ? (format as OpenAIResponseFormat) : DEFAULT_FORMAT;
}

const SPEED_DEFAULT = 1;

function supportsInstructions(model: OpenAITTSModel): boolean {
  return model === "gpt-4o-mini-tts";
}

function buildInstructions(settings: OpenAIProviderSettings, override: string | undefined, rate: number): string {
  const trimmedOverride = override?.trim();
  const base = trimmedOverride
    ? trimmedOverride
    : composeStyleInstruction({
        tone: settings.tone,
        expressiveness: settings.expressiveness,
        delivery: settings.delivery,
        accentFocus: settings.accentFocus,
        extraNotes: settings.instructions,
      });
  const parts = [base, rateToInstruction(rate)].filter(Boolean);
  return parts.join("\n");
}
