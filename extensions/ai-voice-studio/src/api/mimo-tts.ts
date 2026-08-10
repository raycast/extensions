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
import type { MimoTTSModel, TTSOptionOverrides, TTSOptions } from "./mimo-types";
import { validateVoiceForModel } from "./provider-option-helpers";
import { prepareTTSInput, requestTTSWithTimeout, requirePreference } from "./shared-tts-api";
import { TTSApiError, normalizeErrorCode } from "./tts-api-error";
export { TTSApiError } from "./tts-api-error";

const DEFAULT_TOKEN_PLAN_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1";
const DEFAULT_AUDIO_FORMAT = "wav";

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
  const trimmedText = prepareTTSInput(text, signal);
  const prefs = getPreferenceValues<Preferences>();
  const apiKey = requirePreference(
    prefs,
    "mimoApiKey",
    "MiMo Token Plan API key is required. Add it in extension preferences.",
  );
  if (apiKey.startsWith("sk-")) {
    throw new TTSApiError("Use a MiMo Token Plan API key that starts with tp-, not a pay-as-you-go sk- key.", -1);
  }

  const response = await postWithTimeout(
    buildChatCompletionsUrl(options.tokenPlanBaseUrl),
    {
      model: options.model,
      messages: buildMessages(applyAssistantControls(trimmedText, options), options.stylePrompt),
      audio: {
        format: options.format,
        voice: options.voice,
      },
      stream: false,
    },
    apiKey,
    signal,
  );

  const audio = response.choices?.[0]?.message?.audio?.data;
  if (!audio) {
    throw new TTSApiError(`No audio data returned from MiMo TTS (${options.voice}).`, -4);
  }

  return audio;
}

async function postWithTimeout(
  url: string,
  body: Record<string, unknown>,
  apiKey: string,
  signal?: AbortSignal,
): Promise<MimoTTSResponse> {
  return requestTTSWithTimeout(signal, async (requestSignal) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: requestSignal,
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
  });
}

function buildMessages(text: string, stylePrompt?: string): Array<{ role: "user" | "assistant"; content: string }> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  const style = stylePrompt?.trim();

  if (style) {
    messages.push({ role: "user", content: style });
  }

  messages.push({ role: "assistant", content: text });
  return messages;
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
  validateVoiceForModel({
    getVoiceById,
    isVoiceAvailableForModel,
    model,
    modelLabel: MODEL_LABELS[model],
    providerName: "MiMo",
    throwConfigError: (message) => {
      throw new TTSApiError(message, -1);
    },
    voice,
  });

  const rate =
    typeof speedOverrideRate === "number"
      ? speedOverrideRate
      : overrides.speechRate !== undefined
        ? parseRateString(overrides.speechRate)
        : parseRateString(settings.speechRate);

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
  };
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

/** Validate preferences without making any network call. */
export async function validateOptions(voiceOverride?: string): Promise<TTSOptions> {
  return buildOptionsFromPrefs(voiceOverride);
}

function normalizeModel(model: string | undefined): MimoTTSModel {
  return model === "mimo-v2-tts" ? "mimo-v2-tts" : DEFAULT_MODEL;
}

function buildStylePrompt(
  stylePrompt: string | undefined,
  rate: number,
  additionalStylePrompt?: string,
): string | undefined {
  const promptParts = [stylePrompt?.trim(), additionalStylePrompt?.trim(), rateToInstruction(rate)].filter(Boolean);
  return promptParts.length > 0 ? promptParts.join("\n") : undefined;
}

function normalizeTags(tags: string[] | undefined): string[] {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
}

function isSingingTag(tag: string): boolean {
  return ["唱歌", "sing", "singing"].includes(tag.toLowerCase());
}
