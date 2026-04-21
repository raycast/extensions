import { getPreferenceValues } from "@raycast/api";
import { randomUUID } from "crypto";
import { getVoiceById } from "../constants/voices";
import type { TTSV3Request, TTSV3ResponseChunk, TTSOptions } from "./types";

const API_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const AUDIO_CHUNK_CODE = 0;
const STREAM_COMPLETE_CODE = 20000000;
const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_AUDIO_FORMAT = "mp3";
const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_SPEAKER = "zh_female_vv_uranus_bigtts";
type TTSAuthHeaders = Record<"Content-Type" | "X-Api-Resource-Id", string> &
  Partial<Record<"X-Api-Key" | "X-Api-App-Id" | "X-Api-Access-Key", string>>;

/**
 * Synthesize speech using the V3 streaming API.
 *
 * Sends text to the Doubao TTS V3 endpoint, reads the full response,
 * parses JSON lines, and returns the combined audio as base64.
 */
export async function synthesizeSpeech(text: string, options: TTSOptions): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  const resourceId = prefs.resourceId || "seed-tts-2.0";
  const headers = buildAuthHeaders(prefs, resourceId);

  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text cannot be empty");
  }

  const requestBody: TTSV3Request = {
    user: { uid: `raycast-${randomUUID().slice(0, 8)}` },
    req_params: {
      text: trimmedText,
      speaker: options.speaker,
      audio_params: {
        format: options.format,
        sample_rate: options.sampleRate,
        speech_rate: options.speechRate,
      },
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail =
        response.status === 401
          ? "Authentication failed. Please check API Key or legacy App ID/Access Key in preferences."
          : `${response.statusText} (speaker: ${options.speaker})`;
      throw new TTSApiError(`HTTP ${response.status}: ${detail}`, response.status);
    }

    return await parseStreamResponse(response, options.speaker);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new TTSApiError("Request timeout after 30 seconds", -2);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildAuthHeaders(prefs: Preferences, resourceId: string): TTSAuthHeaders {
  const apiKey = prefs.apiKey?.trim();
  const appId = prefs.appId?.trim();
  const accessKey = prefs.accessKey?.trim();
  const headers: TTSAuthHeaders = {
    "Content-Type": "application/json",
    "X-Api-Resource-Id": resourceId,
  };

  if (apiKey) {
    return { ...headers, "X-Api-Key": apiKey };
  }

  if (appId && accessKey) {
    return { ...headers, "X-Api-App-Id": appId, "X-Api-Access-Key": accessKey };
  }

  throw new TTSApiError(
    "API Key is required. Configure API Key, or provide legacy App ID and Access Key in extension preferences.",
    -1,
  );
}

/**
 * Parse the V3 response (JSON lines) and accumulate audio data.
 *
 * Reads the HTTP response body incrementally, splits completed JSON lines,
 * decodes each base64 audio chunk to binary, concatenates, then re-encodes to base64.
 */
async function parseStreamResponse(response: Response, speaker: string): Promise<string> {
  if (!response.body) {
    return parseResponseText(await response.text(), speaker);
  }

  const audioBuffers: Uint8Array[] = [];
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let reading = true;

  try {
    while (reading) {
      const { done, value } = await reader.read();
      if (done) {
        reading = false;
        continue;
      }

      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line.trim(), speaker, audioBuffers);
      }
    }

    pending += decoder.decode();
    if (pending.trim()) {
      processLine(pending.trim(), speaker, audioBuffers);
    }
  } finally {
    reader.releaseLock();
  }

  return encodeAudioBuffers(audioBuffers);
}

function parseResponseText(text: string, speaker: string): string {
  if (!text.trim()) {
    throw new TTSApiError("Empty response body", -3);
  }

  const audioBuffers: Uint8Array[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    processLine(line.trim(), speaker, audioBuffers);
  }

  return encodeAudioBuffers(audioBuffers);
}

function encodeAudioBuffers(audioBuffers: Uint8Array[]): string {
  if (audioBuffers.length === 0) {
    throw new TTSApiError("No audio data received from TTS API", -4);
  }

  return Buffer.concat(audioBuffers).toString("base64");
}

function processLine(line: string, speaker: string, audioBuffers: Uint8Array[]): void {
  if (!line) return;

  const chunk = parseChunk(line, speaker);

  if (chunk.code === AUDIO_CHUNK_CODE) {
    // code 0 = audio chunk (data is base64) or sentence info (data is null)
    if (chunk.data) {
      const decoded = Buffer.from(chunk.data, "base64");
      if (decoded.length > 0) {
        audioBuffers.push(new Uint8Array(decoded));
      }
    }
    // data is null/empty → sentence metadata, skip silently
  } else if (chunk.code === STREAM_COMPLETE_CODE) {
    // Stream finished normally
  } else {
    throw new TTSApiError(
      `${chunk.message || "Unknown TTS error"} (code: ${chunk.code}, speaker: ${speaker})`,
      chunk.code,
    );
  }
}

function parseChunk(line: string, speaker: string): TTSV3ResponseChunk {
  try {
    const parsed = JSON.parse(line);
    if (typeof parsed !== "object" || parsed === null || typeof parsed.code !== "number") {
      throw new TTSApiError(`Unexpected response format from TTS API (speaker: ${speaker})`, -5);
    }
    return parsed as TTSV3ResponseChunk;
  } catch (err) {
    if (err instanceof TTSApiError) throw err;
    throw new TTSApiError(`Invalid JSON in stream response (speaker: ${speaker})`, -5);
  }
}

/**
 * Map resourceId to the base model version used for voice filtering.
 * e.g. "seed-tts-1.0-concurr" → "seed-tts-1.0", "seed-icl-2.0" → "seed-tts-2.0"
 */
export function getBaseModel(resourceId: string): "seed-tts-1.0" | "seed-tts-2.0" {
  if (resourceId === "seed-tts-1.0-concurr" || resourceId === "seed-tts-1.0") return "seed-tts-1.0";
  if (resourceId === "seed-icl-1.0") return "seed-tts-1.0";
  // seed-tts-2.0, seed-icl-2.0, or any unknown → default to 2.0
  return "seed-tts-2.0";
}

/**
 * Build TTSOptions from user preferences, optionally overriding the speaker.
 */
export function buildOptionsFromPrefs(speakerOverride?: string): TTSOptions {
  const prefs = getPreferenceValues<Preferences>();
  const currentModel = prefs.resourceId || "seed-tts-2.0";
  const baseModel = getBaseModel(currentModel);
  const speaker = speakerOverride || prefs.defaultVoice || DEFAULT_SPEAKER;

  // Validate voice is compatible with the selected model
  const voiceConfig = getVoiceById(speaker);
  if (voiceConfig && voiceConfig.model !== baseModel) {
    throw new TTSApiError(
      `Voice "${voiceConfig.name}" requires ${voiceConfig.model}, but the current model is ${currentModel}. Please change the default voice or model version in preferences.`,
      -1,
    );
  }

  const rawRate = parseInt(prefs.speechRate, 10);
  // V3 API speech_rate: -50 (0.5x) to 100 (2x), 0 = normal
  const speechRate = isNaN(rawRate) ? 0 : Math.max(-50, Math.min(100, rawRate));

  return {
    speaker,
    speechRate,
    format: DEFAULT_AUDIO_FORMAT,
    sampleRate: DEFAULT_SAMPLE_RATE,
  };
}

export class TTSApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "TTSApiError";
    this.code = code;
  }
}
