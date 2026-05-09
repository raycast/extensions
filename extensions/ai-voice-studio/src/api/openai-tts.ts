import { getPreferenceValues } from "@raycast/api";
import {
  DEFAULT_FORMAT,
  DEFAULT_MODEL,
  DEFAULT_VOICE,
  MODEL_LABELS,
  getVoiceById,
  isVoiceAvailableForModel,
} from "../constants/openai-voices";
import { getSpeedOverride, parseRateString, rateToInstruction } from "../utils/openai-playback-state";
import { getOpenAISettings, type OpenAIProviderSettings } from "../utils/provider-settings";
import type { OpenAITTSModel, OpenAIResponseFormat, TTSOptionOverrides, TTSOptions } from "./openai-types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const REQUEST_TIMEOUT_MS = 90_000;

interface OpenAIErrorResponse {
  error?: {
    message?: string;
    code?: string | number;
    type?: string;
  };
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
  const apiKey = prefs.openaiApiKey?.trim();
  if (!apiKey) {
    throw new TTSApiError("OpenAI API key is required. Add it in extension preferences.", -1);
  }

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

    if (!response.ok) {
      throw new TTSApiError(await readErrorDetail(response), response.status);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new TTSApiError("OpenAI TTS returned an empty audio file.", -4);
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
  const voiceConfig = getVoiceById(voice);

  if (!voiceConfig) {
    throw new TTSApiError(`Unknown voice "${voice}". Pick an OpenAI voice in preferences or Set Quick Read Voice.`, -1);
  }

  if (!isVoiceAvailableForModel(voiceConfig, model)) {
    throw new TTSApiError(
      `${voiceConfig.name} is not available for ${MODEL_LABELS[model]}. Change the model or choose another voice.`,
      -1,
    );
  }

  const rate =
    typeof speedOverrideRate === "number"
      ? speedOverrideRate
      : parseRateString(settings.playbackRate || String(SPEED_DEFAULT));

  return {
    model,
    voice,
    instructions: buildInstructions(overrides.instructions ?? settings.instructions, rate),
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
  if (model === "tts-1" || model === "tts-1-hd" || model === "gpt-4o-mini-tts") return model;
  return DEFAULT_MODEL;
}

function normalizeFormat(format: string | undefined): OpenAIResponseFormat {
  return format === "wav" || format === "mp3" ? format : DEFAULT_FORMAT;
}

const SPEED_DEFAULT = 1;

function supportsInstructions(model: OpenAITTSModel): boolean {
  return model === "gpt-4o-mini-tts";
}

function buildInstructions(base: string | undefined, rate: number): string | undefined {
  const parts = [base?.trim(), rateToInstruction(rate)].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : undefined;
}

export class TTSApiError extends Error {
  constructor(
    message: string,
    public code: number,
  ) {
    super(message);
    this.name = "TTSApiError";
  }
}
