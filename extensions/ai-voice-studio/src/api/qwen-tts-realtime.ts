import { randomUUID } from "crypto";
import { getPreferenceValues } from "@raycast/api";
import { TTSApiError } from "./qwen-tts";
import type { TTSOptions } from "./qwen-tts-types";

export type QwenRealtimeModel = "qwen3-tts-flash-realtime" | "qwen3-tts-instruct-flash-realtime";

export interface RealtimeStreamCallbacks {
  onFirstAudio?: () => void | Promise<void>;
  onPcmChunk: (pcm: Buffer) => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
}

const REALTIME_PATH = "/api-ws/v1/realtime";
const SESSION_OPEN_TIMEOUT_MS = 8_000;
const FIRST_AUDIO_TIMEOUT_MS = 15_000;

export function toRealtimeModel(model: TTSOptions["model"]): QwenRealtimeModel | null {
  if (model === "qwen3-tts-flash") return "qwen3-tts-flash-realtime";
  if (model === "qwen3-tts-instruct-flash") return "qwen3-tts-instruct-flash-realtime";
  return null;
}

export function buildRealtimeWsUrl(httpBaseUrl: string, model: QwenRealtimeModel): string {
  const url = new URL(httpBaseUrl);
  return `wss://${url.host}${REALTIME_PATH}?model=${encodeURIComponent(model)}`;
}

export async function streamRealtimeSpeech(
  text: string,
  options: TTSOptions,
  callbacks: RealtimeStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new TTSApiError("Text cannot be empty", -1);

  const realtimeModel = toRealtimeModel(options.model);
  if (!realtimeModel) {
    throw new TTSApiError(`Model ${options.model} does not support realtime synthesis`, -1);
  }

  const apiKey = getPreferenceValues<Preferences>().dashscopeApiKey?.trim();
  if (!apiKey) {
    throw new TTSApiError("Qwen DashScope API key is required for Qwen-TTS. Add it in extension preferences.", -1);
  }

  if (signal?.aborted) throw new TTSApiError("TTS synthesis cancelled", -7);

  const wsUrl = buildRealtimeWsUrl(options.baseUrl, realtimeModel);
  // Node 22+ ships a built-in WebSocket (powered by undici) whose second
  // argument accepts a `headers` option — required for DashScope's Bearer
  // auth. The type from @types/node already exposes this on the global.
  const ws = new WebSocket(wsUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  let firstAudioFired = false;
  let resolved = false;
  let openTimeout: NodeJS.Timeout | undefined;
  let firstAudioTimeout: NodeJS.Timeout | undefined;
  let removeAbortListener: (() => void) | undefined;

  const cleanup = () => {
    clearTimeout(openTimeout);
    clearTimeout(firstAudioTimeout);
    removeAbortListener?.();
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      try {
        ws.close(1000, "done");
      } catch {
        // ignore
      }
    }
  };

  return new Promise<void>((resolve, reject) => {
    const finishSuccess = async () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      try {
        await callbacks.onComplete?.();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      resolve();
    };

    const finishFailure = (error: unknown) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      if (error instanceof TTSApiError) {
        reject(error);
      } else if (error instanceof Error) {
        reject(new TTSApiError(error.message, -6));
      } else {
        reject(new TTSApiError(String(error), -6));
      }
    };

    openTimeout = setTimeout(() => {
      finishFailure(new TTSApiError(`Realtime connection timeout after ${SESSION_OPEN_TIMEOUT_MS / 1000}s`, -2));
    }, SESSION_OPEN_TIMEOUT_MS);

    if (signal) {
      const abortHandler = () => finishFailure(new TTSApiError("TTS synthesis cancelled", -7));
      signal.addEventListener("abort", abortHandler, { once: true });
      removeAbortListener = () => signal.removeEventListener("abort", abortHandler);
    }

    ws.addEventListener("open", () => {
      clearTimeout(openTimeout);
      firstAudioTimeout = setTimeout(() => {
        finishFailure(new TTSApiError(`No audio received within ${FIRST_AUDIO_TIMEOUT_MS / 1000}s`, -2));
      }, FIRST_AUDIO_TIMEOUT_MS);

      send(ws, {
        event_id: nextEventId(),
        type: "session.update",
        session: buildSessionConfig(realtimeModel, options),
      });

      send(ws, {
        event_id: nextEventId(),
        type: "input_text_buffer.append",
        text: trimmed,
      });
      send(ws, {
        event_id: nextEventId(),
        type: "input_text_buffer.commit",
      });
      send(ws, {
        event_id: nextEventId(),
        type: "session.finish",
      });
    });

    ws.addEventListener("message", async (event) => {
      let msg: RealtimeEvent;
      try {
        msg = JSON.parse(event.data.toString()) as RealtimeEvent;
      } catch {
        return;
      }

      switch (msg.type) {
        case "response.audio.delta": {
          if (!msg.delta) return;
          try {
            const pcm = Buffer.from(msg.delta, "base64");
            if (!firstAudioFired) {
              firstAudioFired = true;
              clearTimeout(firstAudioTimeout);
              await callbacks.onFirstAudio?.();
            }
            await callbacks.onPcmChunk(pcm);
          } catch (error) {
            finishFailure(error);
          }
          return;
        }
        case "session.finished":
        case "response.done": {
          // response.done arrives before session.finished; wait for the latter for clean close
          if (msg.type === "session.finished") {
            await finishSuccess();
          }
          return;
        }
        case "error": {
          const errMsg = msg.error?.message || "Realtime synthesis error";
          const code = msg.error?.code === "InvalidApiKey" ? -1 : -6;
          finishFailure(new TTSApiError(errMsg, code));
          return;
        }
      }
    });

    ws.addEventListener("error", () => {
      finishFailure(new TTSApiError("WebSocket connection failed", -6));
    });

    ws.addEventListener("close", (event) => {
      if (resolved) return;
      if (event.code === 1000) {
        // graceful close before we saw session.finished — treat as complete
        void finishSuccess();
      } else {
        finishFailure(new TTSApiError(`WebSocket closed unexpectedly: code=${event.code}`, -6));
      }
    });
  });
}

function buildSessionConfig(model: QwenRealtimeModel, options: TTSOptions): Record<string, unknown> {
  // Note: `model` is set via the `?model=...` query string at connect time;
  // `session.update` only configures voice/format/mode/etc.
  const config: Record<string, unknown> = {
    voice: options.voice,
    response_format: "pcm",
    sample_rate: 24000,
    mode: "commit",
  };

  if (options.languageType && options.languageType !== "Auto") {
    config.language_type = options.languageType;
  }

  if (model === "qwen3-tts-instruct-flash-realtime") {
    if (options.instructions) config.instructions = options.instructions;
    if (options.optimizeInstructions) config.optimize_instructions = true;
  }

  return config;
}

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function nextEventId(): string {
  return `event_${randomUUID().replace(/-/g, "").slice(0, 22)}`;
}

interface RealtimeEvent {
  event_id?: string;
  type: string;
  delta?: string;
  error?: { code?: string; message?: string };
}
