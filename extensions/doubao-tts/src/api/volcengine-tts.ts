import { getPreferenceValues } from "@raycast/api";
import { randomUUID } from "crypto";
import WebSocket, { type RawData } from "ws";
import { getVoiceById } from "../constants/voices";
import type { TTSOptions } from "./types";

const WS_API_URL = "wss://openspeech.bytedance.com/api/v3/tts/bidirection";
const API_SUCCESS_CODE = 20000000;
const REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_AUDIO_FORMAT = "mp3";
const DEFAULT_SAMPLE_RATE = 24000;
// Volcengine's documented MP3 bitrate for this extension's playback profile.
const DEFAULT_BIT_RATE = 128000;
const DEFAULT_SPEAKER = "zh_female_vv_uranus_bigtts";
const WS_HEADER = Buffer.from([0x11, 0x14, 0x10, 0x00]);
const SERVER_FULL_RESPONSE = 0x9;
const SERVER_AUDIO_ONLY_RESPONSE = 0xb;
const SERVER_ERROR_RESPONSE = 0xf;
const MESSAGE_FLAG_WITH_EVENT = 0x4;

type TTSAuthHeaders = Record<"X-Api-Resource-Id" | "X-Api-Connect-Id", string> &
  Partial<Record<"X-Api-Key" | "X-Api-App-Id" | "X-Api-Access-Key", string>>;

enum TTSWsEvent {
  StartConnection = 1,
  FinishConnection = 2,
  ConnectionStarted = 50,
  ConnectionFailed = 51,
  ConnectionFinished = 52,
  StartSession = 100,
  FinishSession = 102,
  SessionStarted = 150,
  SessionFinished = 152,
  SessionFailed = 153,
  TaskRequest = 200,
  TTSResponse = 352,
}

interface ParsedWsMessage {
  event?: number;
  payload?: unknown;
  audio?: Buffer;
  errorCode?: number;
  errorMessage?: string;
}

/**
 * Synthesize speech using Doubao TTS V3 bidirectional WebSocket streaming.
 *
 * The upper playback pipeline still consumes one completed audio buffer per
 * text chunk, but the API transport itself now uses the latest V3 WebSocket
 * flow and accumulates audio frames as they arrive.
 */
export async function synthesizeSpeech(text: string, options: TTSOptions, signal?: AbortSignal): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  const resourceId = prefs.resourceId || "seed-tts-2.0";
  const connectId = randomUUID();
  const headers = buildAuthHeaders(prefs, resourceId, connectId);

  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text cannot be empty");
  }

  if (signal?.aborted) {
    throw new TTSApiError("TTS synthesis cancelled", -7);
  }

  return synthesizeWithWebSocket(trimmedText, options, headers, signal);
}

function buildAuthHeaders(prefs: Preferences, resourceId: string, connectId: string): TTSAuthHeaders {
  const apiKey = prefs.apiKey?.trim();
  const appId = prefs.appId?.trim();
  const accessKey = prefs.accessKey?.trim();
  const headers: TTSAuthHeaders = {
    "X-Api-Resource-Id": resourceId,
    "X-Api-Connect-Id": connectId,
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

function synthesizeWithWebSocket(
  text: string,
  options: TTSOptions,
  headers: TTSAuthHeaders,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_API_URL, { headers });
    const sessionId = randomUUID();
    const userId = `raycast-${randomUUID().slice(0, 8)}`;
    const audioBuffers: Buffer[] = [];
    let settled = false;
    let finishSessionSent = false;

    const timeoutId = setTimeout(() => {
      fail(new TTSApiError(`Request timeout after ${REQUEST_TIMEOUT_MS / 1000} seconds`, -2));
    }, REQUEST_TIMEOUT_MS);
    const abortHandler = () => fail(new TTSApiError("TTS synthesis cancelled", -7));

    signal?.addEventListener("abort", abortHandler, { once: true });

    function cleanup() {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortHandler);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }

    function fail(error: unknown) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    }

    function succeed() {
      if (settled) return;
      if (audioBuffers.length === 0) {
        fail(new TTSApiError(`No audio data received from TTS API (speaker: ${options.speaker})`, -4));
        return;
      }

      settled = true;
      const audio = Buffer.concat(audioBuffers).toString("base64");
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(buildConnectionFrame(TTSWsEvent.FinishConnection), () => cleanup());
      } else {
        cleanup();
      }
      resolve(audio);
    }

    function send(frame: Buffer) {
      if (ws.readyState !== WebSocket.OPEN) {
        fail(new TTSApiError("WebSocket closed before the TTS request completed", -6));
        return;
      }
      ws.send(frame);
    }

    ws.on("open", () => {
      send(buildConnectionFrame(TTSWsEvent.StartConnection));
    });

    ws.on("message", (data) => {
      try {
        const message = parseWsMessage(data);

        if (message.errorMessage) {
          fail(new TTSApiError(`${message.errorMessage} (speaker: ${options.speaker})`, message.errorCode ?? -6));
          return;
        }

        if (message.audio && message.audio.length > 0) {
          audioBuffers.push(message.audio);
        }

        switch (message.event) {
          case TTSWsEvent.ConnectionStarted:
            send(buildSessionFrame(TTSWsEvent.StartSession, sessionId, buildStartSessionPayload(options, userId)));
            break;

          case TTSWsEvent.SessionStarted:
            send(buildSessionFrame(TTSWsEvent.TaskRequest, sessionId, buildTaskPayload(text, options, userId)));
            send(buildSessionFrame(TTSWsEvent.FinishSession, sessionId, {}));
            finishSessionSent = true;
            break;

          case TTSWsEvent.SessionFinished: {
            const errorMessage = getStatusError(message.payload);
            if (errorMessage) {
              fail(
                new TTSApiError(`${errorMessage} (speaker: ${options.speaker})`, getStatusCode(message.payload) ?? -6),
              );
              return;
            }
            succeed();
            break;
          }

          case TTSWsEvent.ConnectionFailed:
          case TTSWsEvent.SessionFailed:
            fail(
              new TTSApiError(
                `${stringifyPayloadMessage(message.payload) || "TTS WebSocket request failed"} (speaker: ${
                  options.speaker
                })`,
                getStatusCode(message.payload) ?? -6,
              ),
            );
            break;

          case TTSWsEvent.TTSResponse:
            if (!finishSessionSent) {
              send(buildSessionFrame(TTSWsEvent.FinishSession, sessionId, {}));
              finishSessionSent = true;
            }
            break;
        }
      } catch (error) {
        fail(error);
      }
    });

    ws.on("error", (error) => {
      fail(new TTSApiError(`WebSocket error: ${error.message} (speaker: ${options.speaker})`, -6));
    });

    ws.on("close", (code, reason) => {
      if (!settled && code !== 1000) {
        const detail = reason.length > 0 ? reason.toString("utf8") : `close code ${code}`;
        fail(new TTSApiError(`WebSocket closed before completion: ${detail} (speaker: ${options.speaker})`, -6));
      }
    });
  });
}

function buildStartSessionPayload(options: TTSOptions, userId: string): Record<string, unknown> {
  return {
    user: { uid: userId },
    event: TTSWsEvent.StartSession,
    namespace: "BidirectionalTTS",
    req_params: {
      text: "",
      speaker: options.speaker,
      audio_params: {
        format: options.format,
        sample_rate: options.sampleRate,
        speech_rate: options.speechRate,
        bit_rate: DEFAULT_BIT_RATE,
      },
    },
  };
}

function buildTaskPayload(text: string, options: TTSOptions, userId: string): Record<string, unknown> {
  return {
    user: { uid: userId },
    event: TTSWsEvent.TaskRequest,
    namespace: "BidirectionalTTS",
    req_params: {
      text,
      speaker: options.speaker,
      audio_params: {
        format: options.format,
        sample_rate: options.sampleRate,
        speech_rate: options.speechRate,
        bit_rate: DEFAULT_BIT_RATE,
      },
    },
  };
}

function buildConnectionFrame(event: TTSWsEvent.StartConnection | TTSWsEvent.FinishConnection): Buffer {
  return buildFrame(event, {});
}

function buildSessionFrame(event: TTSWsEvent, sessionId: string, payload: Record<string, unknown>): Buffer {
  return buildFrame(event, payload, sessionId);
}

function buildFrame(event: TTSWsEvent, payload: Record<string, unknown>, sessionId?: string): Buffer {
  const payloadBuffer = Buffer.from(JSON.stringify(payload), "utf8");
  const parts = [WS_HEADER, int32(event)];

  if (sessionId) {
    const sessionBuffer = Buffer.from(sessionId, "utf8");
    parts.push(uint32(sessionBuffer.length), sessionBuffer);
  }

  parts.push(uint32(payloadBuffer.length), payloadBuffer);
  return Buffer.concat(parts);
}

function parseWsMessage(data: RawData): ParsedWsMessage {
  const buffer = rawDataToBuffer(data);
  if (buffer.length < 4) {
    throw new TTSApiError("Invalid WebSocket response: header is too short", -5);
  }

  const headerSize = (buffer[0] & 0x0f) * 4;
  const messageType = buffer[1] >> 4;
  const messageFlags = buffer[1] & 0x0f;
  let offset = headerSize;

  if (messageType === SERVER_ERROR_RESPONSE) {
    const errorCode = buffer.length >= offset + 4 ? buffer.readInt32BE(offset) : -6;
    offset += 4;
    return {
      errorCode,
      errorMessage: decodePayloadMessage(buffer.subarray(offset)) || `TTS WebSocket protocol error ${errorCode}`,
    };
  }

  const parsed: ParsedWsMessage = {};
  if ((messageFlags & MESSAGE_FLAG_WITH_EVENT) === MESSAGE_FLAG_WITH_EVENT) {
    ensureReadable(buffer, offset, 4, "event");
    parsed.event = buffer.readInt32BE(offset);
    offset += 4;
  }

  if (messageType !== SERVER_FULL_RESPONSE && messageType !== SERVER_AUDIO_ONLY_RESPONSE) {
    return parsed;
  }

  const payload = readPayloadWithOptionalId(buffer, offset);
  if (messageType === SERVER_AUDIO_ONLY_RESPONSE) {
    parsed.audio = payload;
    return parsed;
  }

  parsed.payload = decodePayload(payload);
  return parsed;
}

function readPayloadWithOptionalId(buffer: Buffer, offset: number): Buffer {
  if (offset >= buffer.length) return Buffer.alloc(0);
  ensureReadable(buffer, offset, 4, "payload or id length");

  const firstLength = buffer.readUInt32BE(offset);
  offset += 4;
  const bytesAfterFirstLength = buffer.length - offset;

  if (firstLength === bytesAfterFirstLength) {
    return buffer.subarray(offset, offset + firstLength);
  }

  ensureReadable(buffer, offset, firstLength, "response id");
  offset += firstLength;

  if (offset >= buffer.length) return Buffer.alloc(0);
  ensureReadable(buffer, offset, 4, "payload length");
  const payloadLength = buffer.readUInt32BE(offset);
  offset += 4;

  ensureReadable(buffer, offset, payloadLength, "payload");
  return buffer.subarray(offset, offset + payloadLength);
}

function decodePayload(payload: Buffer): unknown {
  if (payload.length === 0) return undefined;
  const text = payload.toString("utf8");
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function decodePayloadMessage(payload: Buffer): string {
  return stringifyPayloadMessage(decodePayload(payload));
}

function stringifyPayloadMessage(payload: unknown): string {
  if (payload === undefined || payload === null) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return String(payload);

  const record = payload as Record<string, unknown>;
  const message = record.message ?? record.error ?? record.detail;
  if (typeof message === "string") return message;

  try {
    return JSON.stringify(payload);
  } catch {
    return "Unknown TTS WebSocket error";
  }
}

function getStatusCode(payload: unknown): number | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  const statusCode = record.status_code ?? record.code;
  return typeof statusCode === "number" ? statusCode : undefined;
}

function getStatusError(payload: unknown): string | null {
  const statusCode = getStatusCode(payload);
  if (statusCode === undefined || statusCode === 0 || statusCode === API_SUCCESS_CODE) {
    return null;
  }

  return stringifyPayloadMessage(payload) || `TTS request failed with status ${statusCode}`;
}

function rawDataToBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

function int32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value, 0);
  return buffer;
}

function uint32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);
  return buffer;
}

function ensureReadable(buffer: Buffer, offset: number, length: number, label: string): void {
  if (offset + length > buffer.length) {
    throw new TTSApiError(`Invalid WebSocket response: incomplete ${label}`, -5);
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
