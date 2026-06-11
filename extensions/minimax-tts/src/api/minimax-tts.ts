import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_VOICE_ID, normalizeVoiceList } from "../constants/voices";
import type {
  MiniMaxFileUploadResponse,
  MiniMaxRegion,
  MiniMaxVoiceCloneRequest,
  MiniMaxVoiceCloneResponse,
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
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const SUPPORTED_AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".wav"]);
const TOKEN_PLAN_SUPPORTED_MODELS = new Set(["speech-2.8-hd", "speech-2.6-hd", "speech-02-hd"]);
type AuthMode = "auto" | "token-plan" | "payg";
type UploadPurpose = "voice_clone" | "prompt_audio";
type ResolvedAuthMode = "token-plan" | "payg";

function getBaseUrl(region: MiniMaxRegion): string {
  return region === "global" ? "https://api.minimax.io" : "https://api.minimaxi.com";
}

function resolveAuth(model?: string): { apiKey: string; mode: ResolvedAuthMode } {
  const prefs = getPreferenceValues<Preferences>();
  const authMode = parseAuthMode(prefs.authMode);
  const tokenPlanKey = prefs.tokenPlanKey?.trim();
  const openPlatformApiKey = prefs.openPlatformApiKey?.trim();
  const wantsTurboOnlyModel = !!model && !isTokenPlanCompatibleModel(model);

  if (authMode === "token-plan") {
    if (!tokenPlanKey) {
      throw new TTSApiError(getMissingKeyMessage(authMode), -1);
    }
    if (model && !isTokenPlanCompatibleModel(model)) {
      throw new TTSApiError(getIncompatibleTokenPlanModelMessage(model), -6);
    }
    return { apiKey: tokenPlanKey, mode: "token-plan" };
  }

  if (authMode === "payg") {
    if (!openPlatformApiKey) {
      throw new TTSApiError(getMissingKeyMessage(authMode), -1);
    }
    return { apiKey: openPlatformApiKey, mode: "payg" };
  }

  if (wantsTurboOnlyModel) {
    if (openPlatformApiKey) {
      return { apiKey: openPlatformApiKey, mode: "payg" };
    }
    if (tokenPlanKey) {
      throw new TTSApiError(getIncompatibleTokenPlanModelMessage(model), -6);
    }
    throw new TTSApiError(getMissingKeyMessage("payg"), -1);
  }

  if (tokenPlanKey) {
    return { apiKey: tokenPlanKey, mode: "token-plan" };
  }

  if (openPlatformApiKey) {
    return { apiKey: openPlatformApiKey, mode: "payg" };
  }

  throw new TTSApiError(getMissingKeyMessage(authMode), -1);
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
    const { apiKey } = resolveAuth(options.model);
    const response = await fetch(`${getBaseUrl(options.region)}/v1/t2a_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    const { apiKey } = resolveAuth();
    const response = await fetch(`${getBaseUrl(region)}/v1/get_voice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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

export async function uploadAudioFile(filePath: string, purpose: UploadPurpose): Promise<number> {
  const prefs = getPreferenceValues<Preferences>();
  const region = parseRegion(prefs.region);
  const normalizedPath = filePath.trim();

  await validateAudioUpload(normalizedPath);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { apiKey } = resolveAuth();
    const fileBytes = await readFile(normalizedPath);
    const formData = new FormData();
    formData.append("purpose", purpose);
    formData.append(
      "file",
      new Blob([fileBytes], { type: getAudioMimeType(normalizedPath) }),
      basename(normalizedPath),
    );

    const response = await fetch(`${getBaseUrl(region)}/v1/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as MiniMaxFileUploadResponse | null;

    if (!response.ok) {
      const message = payload?.base_resp?.status_msg || response.statusText || "Request failed";
      throw new TTSApiError(`HTTP ${response.status}: ${message}`, response.status);
    }

    const baseResp = payload?.base_resp;
    const fileId = payload?.file?.file_id;
    if (!payload || !baseResp || baseResp.status_code !== 0 || typeof fileId !== "number") {
      throw new TTSApiError(
        `${baseResp?.status_msg || "MiniMax file upload failed"} (code: ${baseResp?.status_code ?? "unknown"})`,
        baseResp?.status_code ?? -3,
      );
    }

    return fileId;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new TTSApiError("File upload timeout after 45 seconds", -2);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function cloneVoice(payload: MiniMaxVoiceCloneRequest): Promise<MiniMaxVoiceCloneResponse> {
  const prefs = getPreferenceValues<Preferences>();
  const region = parseRegion(prefs.region);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { apiKey } = resolveAuth(payload.model);
    const response = await fetch(`${getBaseUrl(region)}/v1/voice_clone`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const cloneResponse = (await response.json().catch(() => null)) as MiniMaxVoiceCloneResponse | null;

    if (!response.ok) {
      const message = cloneResponse?.base_resp?.status_msg || response.statusText || "Request failed";
      throw new TTSApiError(`HTTP ${response.status}: ${message}`, response.status);
    }

    const baseResp = cloneResponse?.base_resp;
    if (!cloneResponse || !baseResp || baseResp.status_code !== 0) {
      throw new TTSApiError(
        `${baseResp?.status_msg || "MiniMax voice clone failed"} (code: ${baseResp?.status_code ?? "unknown"})`,
        baseResp?.status_code ?? -3,
      );
    }

    return cloneResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new TTSApiError("Voice clone timeout after 45 seconds", -2);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function downloadAudioAsBase64(audioUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(audioUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new TTSApiError(`HTTP ${response.status}: Failed to download preview audio`, response.status);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (audioBuffer.length === 0) {
      throw new TTSApiError("Downloaded preview audio is empty", -4);
    }

    return audioBuffer.toString("base64");
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new TTSApiError("Preview audio download timeout after 45 seconds", -2);
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

function parseAuthMode(rawMode: string | undefined): AuthMode {
  if (rawMode === "token-plan" || rawMode === "payg") {
    return rawMode;
  }
  return "auto";
}

function getMissingKeyMessage(authMode: AuthMode): string {
  switch (authMode) {
    case "token-plan":
      return "MiniMax Token Plan Key is required. Configure it in extension preferences.";
    case "payg":
      return "MiniMax Open Platform API Key is required. Configure it in extension preferences.";
    default:
      return "MiniMax API Key is required. Configure a Token Plan Key or Open Platform API Key in extension preferences.";
  }
}

function getIncompatibleTokenPlanModelMessage(model: string): string {
  return `${model} is not available with Token Plan. Token Plan currently supports TTS HD models only. Use speech-2.8-hd / speech-2.6-hd / speech-02-hd, or switch to Open Platform API Key for Turbo.`;
}

function parseSpeechRate(rawRate: string | undefined): number {
  const parsed = Number(rawRate ?? "1");
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0.5, Math.min(2, parsed));
}

async function validateAudioUpload(filePath: string): Promise<void> {
  const extension = extname(filePath).toLowerCase();
  if (!SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
    throw new TTSApiError("Only mp3, m4a, and wav files are supported for voice cloning.", -5);
  }

  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new TTSApiError("Selected path is not a file.", -5);
  }

  if (fileStat.size > MAX_UPLOAD_BYTES) {
    throw new TTSApiError("Audio file must be 20 MB or smaller.", -5);
  }
}

function getAudioMimeType(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}

export function isTokenPlanCompatibleModel(model: string): boolean {
  return TOKEN_PLAN_SUPPORTED_MODELS.has(model);
}

export class TTSApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "TTSApiError";
    this.code = code;
  }
}
