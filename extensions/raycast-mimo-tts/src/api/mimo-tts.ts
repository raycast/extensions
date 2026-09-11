import { getPreferenceValues } from "@raycast/api";
import {
  DEFAULT_MODEL,
  DEFAULT_VOICE,
  MODEL_LABELS,
  getVoiceById,
  isVoiceAvailableForModel,
  normalizeVoiceForModel,
} from "../constants/mimo-voices";
import { getSpeedOverride, parseRateString, rateToInstruction } from "../utils/mimo-playback-state";
import { getMimoSettings, type MimoProviderSettings } from "../utils/provider-settings";
import {
  isPresetModel,
  isVoiceCloneModel,
  isVoiceDesignModel,
  type MimoAudioFormat,
  type MimoTTSModel,
  type TTSOptionOverrides,
  type TTSOptions,
} from "./mimo-types";

const DEFAULT_TOKEN_PLAN_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1";
const REQUEST_TIMEOUT_MS = 90_000;
const DEFAULT_AUDIO_FORMAT: MimoAudioFormat = "wav";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MimoTTSResponse {
  choices?: Array<{
    message?: {
      audio?: {
        data?: string;
      };
    };
  }>;
  error?: {
    message?: string;
    code?: string | number;
  };
}

export async function synthesizeSpeech(text: string, options: TTSOptions, signal?: AbortSignal): Promise<string> {
  const trimmedText = text.trim();
  // voicedesign + optimize_text_preview accepts an empty assistant text because
  // the model rewrites/generates it. All other modes need real input.
  const allowsEmptyText = isVoiceDesignModel(options.model) && options.optimizeTextPreview === true;
  if (!allowsEmptyText && !trimmedText) {
    throw new Error("Text cannot be empty");
  }

  if (signal?.aborted) {
    throw new TTSApiError("TTS synthesis cancelled", -7);
  }

  const prefs = getPreferenceValues<Preferences>();
  const apiKey = prefs.mimoApiKey?.trim();
  if (!apiKey) {
    throw new TTSApiError("MiMo Token Plan API key is required. Add it in extension preferences.", -1);
  }
  if (apiKey.startsWith("sk-")) {
    throw new TTSApiError("Use a MiMo Token Plan API key that starts with tp-, not a pay-as-you-go sk- key.", -1);
  }

  const body = buildRequestBody(trimmedText, options);

  const response = await postWithTimeout(buildChatCompletionsUrl(options.tokenPlanBaseUrl), body, apiKey, signal);

  const audio = response.choices?.[0]?.message?.audio?.data;
  if (!audio) {
    throw new TTSApiError(`No audio data returned from MiMo TTS (${describeVoice(options)}).`, -4);
  }

  return audio;
}

function describeVoice(options: TTSOptions): string {
  if (isVoiceCloneModel(options.model)) return "cloned voice";
  if (isVoiceDesignModel(options.model)) return "designed voice";
  return options.voice;
}

function buildRequestBody(text: string, options: TTSOptions): Record<string, unknown> {
  const audioPayload: Record<string, unknown> = {
    format: options.format,
  };

  if (isVoiceCloneModel(options.model)) {
    if (!options.voiceCloneSample) {
      throw new TTSApiError("Voice Clone model requires a voice sample.", -1);
    }
    audioPayload.voice = `data:${options.voiceCloneSample.mimeType};base64,${options.voiceCloneSample.base64}`;
  } else if (isVoiceDesignModel(options.model)) {
    if (options.optimizeTextPreview) {
      audioPayload.optimize_text_preview = true;
    }
    // voicedesign: voice ID is not used; MiMo generates one from the prompt.
  } else {
    audioPayload.voice = options.voice;
  }

  return {
    model: options.model,
    messages: buildMessages(text, options),
    audio: audioPayload,
    stream: false,
  };
}

function buildMessages(text: string, options: TTSOptions): ChatMessage[] {
  const assistantContent =
    isPresetModel(options.model) || isVoiceCloneModel(options.model) ? applyAssistantControls(text, options) : text;
  const userInstruction = options.stylePrompt?.trim();
  const messages: ChatMessage[] = [];

  if (isVoiceDesignModel(options.model)) {
    if (!userInstruction) {
      throw new TTSApiError("Voice Design requires a description prompt.", -1);
    }
    messages.push({ role: "user", content: userInstruction });
    if (options.optimizeTextPreview && !assistantContent) {
      return messages;
    }
    messages.push({ role: "assistant", content: assistantContent });
    return messages;
  }

  // preset / clone models: user message is optional style instruction.
  if (userInstruction) {
    messages.push({ role: "user", content: userInstruction });
  }
  messages.push({ role: "assistant", content: assistantContent });
  return messages;
}

async function postWithTimeout(
  url: string,
  body: Record<string, unknown>,
  apiKey: string,
  signal?: AbortSignal,
): Promise<MimoTTSResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortHandler = () => controller.abort();
  signal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const data = parseJson(text);

    if (!response.ok) {
      throw new TTSApiError(formatApiError(data, response.status, response.statusText), response.status);
    }

    if (data.error) {
      throw new TTSApiError(data.error.message || "MiMo TTS request failed.", normalizeErrorCode(data.error.code));
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

function applyAssistantControls(text: string, options: TTSOptions): string {
  const openingStyleTags = normalizeTags(options.openingStyleTags);
  const audioEventTags = normalizeTags(options.audioEventTags);
  const singingTag = openingStyleTags.find(isSingingTag);

  if (singingTag) {
    return `(唱歌)${text}`;
  }

  const stylePrefix = openingStyleTags.length > 0 ? `(${openingStyleTags.join(" ")})` : "";
  const eventPrefix = audioEventTags.length > 0 ? `（${audioEventTags.join("，")}）` : "";
  return `${stylePrefix}${eventPrefix}${text}`;
}

function parseJson(text: string): MimoTTSResponse {
  try {
    return JSON.parse(text) as MimoTTSResponse;
  } catch {
    return { error: { message: text || "MiMo TTS returned a non-JSON response." } };
  }
}

function formatApiError(data: MimoTTSResponse, status: number, statusText: string): string {
  return data.error?.message || `MiMo TTS request failed: HTTP ${status} ${statusText}`;
}

function normalizeErrorCode(code: string | number | undefined): number {
  if (typeof code === "number") return code;
  const parsed = Number(code);
  return Number.isFinite(parsed) ? parsed : -6;
}

function buildChatCompletionsUrl(baseUrl: string | undefined): string {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  return `${normalizedBaseUrl}/chat/completions`;
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const trimmed = baseUrl?.trim() || DEFAULT_TOKEN_PLAN_BASE_URL;
  return trimmed.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
}

export function getActiveModel(): MimoTTSModel {
  return DEFAULT_MODEL;
}

export async function getActiveModelAsync(): Promise<MimoTTSModel> {
  const settings = await getMimoSettings();
  return normalizeModel(settings.model);
}

export function getModelLabel(model: MimoTTSModel): string {
  return MODEL_LABELS[model];
}

export async function buildOptionsFromPrefs(
  voiceOverride?: string,
  overrides: TTSOptionOverrides = {},
  speedOverrideRate?: number | null,
): Promise<TTSOptions> {
  const settings = await getMimoSettings();
  return buildOptionsFromSettings(settings, voiceOverride, overrides, speedOverrideRate);
}

function buildOptionsFromSettings(
  settings: MimoProviderSettings,
  voiceOverride?: string,
  overrides: TTSOptionOverrides = {},
  speedOverrideRate?: number | null,
): TTSOptions {
  const model = normalizeModel(settings.model);
  const voice = normalizeVoiceForModel(voiceOverride || settings.defaultVoice || DEFAULT_VOICE, model);

  if (isPresetModel(model)) {
    const voiceConfig = getVoiceById(voice);
    if (!voiceConfig) {
      throw new TTSApiError(
        `Unknown voice "${voice}". Pick a MiMo voice in Setup Voice Defaults or Set Quick Read Voice.`,
        -1,
      );
    }
    if (!isVoiceAvailableForModel(voiceConfig, model)) {
      throw new TTSApiError(
        `${voiceConfig.name} is not available for ${MODEL_LABELS[model]}. Change the model or choose another voice.`,
        -1,
      );
    }
  }

  const rate =
    typeof speedOverrideRate === "number"
      ? speedOverrideRate
      : overrides.speechRate !== undefined
        ? parseRateString(overrides.speechRate)
        : parseRateString(settings.speechRate);

  return assembleTTSOptions(model, voice, settings, rate, overrides);
}

/**
 * Build TTS options honoring the global speed override (LocalStorage).
 * Use this whenever the user has not explicitly chosen a rate in the UI.
 */
export async function buildOptionsAsync(
  voiceOverride?: string,
  overrides: TTSOptionOverrides = {},
): Promise<TTSOptions> {
  const speedOverride = await getSpeedOverride();
  return buildOptionsFromPrefs(voiceOverride, overrides, speedOverride);
}

/**
 * Build options for a one-off non-default model (voicedesign / voiceclone)
 * without polluting the user's default model preference.
 */
export async function buildOptionsForModel(
  model: MimoTTSModel,
  overrides: TTSOptionOverrides = {},
): Promise<TTSOptions> {
  const settings = await getMimoSettings();
  const rate = (await getSpeedOverride()) ?? parseRateString(settings.speechRate);
  const voice = normalizeVoiceForModel(settings.defaultVoice || DEFAULT_VOICE, model);
  return assembleTTSOptions(model, voice, settings, rate, overrides);
}

/** Validate preferences without making any network call. */
export async function validateOptions(voiceOverride?: string): Promise<TTSOptions> {
  return buildOptionsFromPrefs(voiceOverride);
}

function normalizeModel(model: string | undefined): MimoTTSModel {
  switch (model) {
    case "mimo-v2-tts":
    case "mimo-v2.5-tts-voicedesign":
    case "mimo-v2.5-tts-voiceclone":
      return model;
    default:
      return DEFAULT_MODEL;
  }
}

function buildStylePrompt(
  stylePrompt: string | undefined,
  rate: number,
  additionalStylePrompt?: string,
): string | undefined {
  const promptParts = [stylePrompt?.trim(), additionalStylePrompt?.trim(), rateToInstruction(rate)].filter(Boolean);
  return promptParts.length > 0 ? promptParts.join("\n") : undefined;
}

function assembleTTSOptions(
  model: MimoTTSModel,
  voice: string,
  settings: MimoProviderSettings,
  rate: number,
  overrides: TTSOptionOverrides,
): TTSOptions {
  return {
    model,
    voice,
    stylePrompt: buildStylePrompt(
      overrides.baseStylePrompt ?? settings.stylePrompt,
      rate,
      overrides.additionalStylePrompt,
    ),
    openingStyleTags: normalizeTags(overrides.openingStyleTags),
    audioEventTags: normalizeTags(overrides.audioEventTags),
    format: DEFAULT_AUDIO_FORMAT,
    playbackRate: rate,
    tokenPlanBaseUrl: settings.tokenPlanBaseUrl,
    optimizeTextPreview: overrides.optimizeTextPreview,
    voiceCloneSample: overrides.voiceCloneSample,
  };
}

function normalizeTags(tags: string[] | undefined): string[] {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
}

function isSingingTag(tag: string): boolean {
  return ["唱歌", "sing", "singing"].includes(tag.toLowerCase());
}

export class TTSApiError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "TTSApiError";
    this.code = code;
  }
}
