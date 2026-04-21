import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_VOICE_ID, normalizeVoiceList } from "../constants/voices";
import type {
  MiniMaxRegion,
  MiniMaxTTSRequest,
  MiniMaxTTSResponse,
  TTSOptions,
  VoiceConfig,
  VoiceListResponse,
} from "./types";

const REQUEST_TIMEOUT_MS = 45_000;
const DEFAULT_MODEL = "speech-2.8-hd";
const DEFAULT_AUDIO_FORMAT = "mp3";
const DEFAULT_SAMPLE_RATE = 32000;
const DEFAULT_BITRATE = 128000;
const DEFAULT_CHANNELS = 1;

function getBaseUrl(region: MiniMaxRegion): string {
  return region === "global" ? "https://api.minimax.io" : "https://api.minimaxi.com";
}

function getApiKey(): string {
  const prefs = getPreferenceValues<Preferences>();
  const apiKey = prefs.apiKey?.trim();
  if (!apiKey) {
    throw new TTSApiError("MiniMax API Key is required. Configure it in extension preferences.", -1);
  }
  return apiKey;
}

export async function synthesizeSpeech(text: string, options: TTSOptions): Promise<string> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text cannot be empty");
  }

  const requestBody: MiniMaxTTSRequest = {
    model: options.model,
    text: trimmedText,
    stream: false,
    output_format: "hex",
    language_boost: options.languageBoost,
    voice_setting: {
      voice_id: options.voiceId,
      speed: options.speed,
      vol: 1,
      pitch: 0,
    },
    audio_setting: {
      sample_rate: options.sampleRate,
      bitrate: options.bitrate,
      format: options.format,
      channel: DEFAULT_CHANNELS,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getBaseUrl(options.region)}/v1/t2a_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as MiniMaxTTSResponse | null;

    if (!response.ok) {
      const message = payload?.base_resp?.status_msg || response.statusText || "Request failed";
      throw new TTSApiError(`HTTP ${response.status}: ${message}`, response.status);
    }

    const baseResp = payload?.base_resp;
    if (!payload || !baseResp || baseResp.status_code !== 0) {
      throw new TTSApiError(
        `${baseResp?.status_msg || "MiniMax TTS failed"} (code: ${baseResp?.status_code ?? "unknown"})`,
        baseResp?.status_code ?? -3,
      );
    }

    const audioHex = payload.data?.audio;
    if (!audioHex) {
      throw new TTSApiError(`No audio data received from MiniMax TTS (trace_id: ${payload.trace_id || "unknown"})`, -4);
    }

    const audioBuffer = Buffer.from(audioHex, "hex");
    if (audioBuffer.length === 0) {
      throw new TTSApiError("Decoded audio data is empty", -4);
    }

    return audioBuffer.toString("base64");
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new TTSApiError("Request timeout after 45 seconds", -2);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function listVoices(): Promise<VoiceConfig[]> {
  const prefs = getPreferenceValues<Preferences>();
  const region = parseRegion(prefs.region);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getBaseUrl(region)}/v1/get_voice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ voice_type: "all" }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as VoiceListResponse | null;

    if (!response.ok) {
      const message = payload?.base_resp?.status_msg || response.statusText || "Request failed";
      throw new TTSApiError(`HTTP ${response.status}: ${message}`, response.status);
    }

    const baseResp = payload?.base_resp;
    if (!payload || !baseResp || baseResp.status_code !== 0) {
      throw new TTSApiError(
        `${baseResp?.status_msg || "MiniMax voice lookup failed"} (code: ${baseResp?.status_code ?? "unknown"})`,
        baseResp?.status_code ?? -3,
      );
    }

    return normalizeVoiceList(payload);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new TTSApiError("Voice lookup timeout after 45 seconds", -2);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function buildOptionsFromPrefs(voiceOverride?: string): TTSOptions {
  const prefs = getPreferenceValues<Preferences>();
  const voiceId = voiceOverride || prefs.customDefaultVoice?.trim() || prefs.defaultVoice || DEFAULT_VOICE_ID;
  const speed = parseSpeechRate(prefs.speechRate);

  return {
    voiceId,
    model: prefs.model || DEFAULT_MODEL,
    speed,
    languageBoost: prefs.languageBoost || "auto",
    region: parseRegion(prefs.region),
    format: DEFAULT_AUDIO_FORMAT,
    sampleRate: DEFAULT_SAMPLE_RATE,
    bitrate: DEFAULT_BITRATE,
  };
}

function parseRegion(region: string | undefined): MiniMaxRegion {
  return region === "global" ? "global" : "cn";
}

function parseSpeechRate(rawRate: string | undefined): number {
  const parsed = Number(rawRate ?? "1");
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0.5, Math.min(2, parsed));
}

export class TTSApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "TTSApiError";
    this.code = code;
  }
}
