import { getPreferenceValues } from "@raycast/api";
import { TTSApiError } from "./minimax-tts";
import type { TTSOptions } from "./minimax-tts-types";

export interface RealtimeStreamCallbacks {
  onFirstAudio?: () => void | Promise<void>;
  onPcmChunk: (pcm: Buffer) => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
}

const REALTIME_PATH = "/ws/v1/t2a_v2";
const SESSION_OPEN_TIMEOUT_MS = 8_000;
const FIRST_AUDIO_TIMEOUT_MS = 15_000;

export function buildRealtimeWsUrl(httpBaseUrl: string): string {
  const url = new URL(httpBaseUrl);
  return `wss://${url.host}${REALTIME_PATH}`;
}

export async function streamRealtimeSpeech(
  text: string,
  options: TTSOptions,
  callbacks: RealtimeStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new TTSApiError("Text cannot be empty", -1);

  const apiKey = getPreferenceValues<Preferences>().minimaxApiKey?.trim();
  if (!apiKey) {
    throw new TTSApiError("MiniMax API key is required. Add it in extension preferences.", -1);
  }

  if (signal?.aborted) throw new TTSApiError("TTS synthesis cancelled", -7);

  const wsUrl = buildRealtimeWsUrl(options.baseUrl);
  // Node 22+ ships a built-in WebSocket (powered by undici) whose second
  // argument accepts a `headers` option — required for MiniMax's Bearer auth.
  const ws = new WebSocket(wsUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  let firstAudioFired = false;
  let resolved = false;
  let started = false;
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
      // MiniMax sends `connected_success` on its own; we don't act until then.
    });

    ws.addEventListener("message", async (event) => {
      let msg: RealtimeEvent;
      try {
        msg = JSON.parse(event.data.toString()) as RealtimeEvent;
      } catch {
        return;
      }

      switch (msg.event) {
        case "connected_success": {
          clearTimeout(openTimeout);
          firstAudioTimeout = setTimeout(() => {
            finishFailure(new TTSApiError(`No audio received within ${FIRST_AUDIO_TIMEOUT_MS / 1000}s`, -2));
          }, FIRST_AUDIO_TIMEOUT_MS);
          send(ws, buildTaskStart(options));
          return;
        }
        case "task_started": {
          if (started) return;
          started = true;
          send(ws, { event: "task_continue", text: trimmed });
          send(ws, { event: "task_finish" });
          return;
        }
        case "task_continued": {
          const audioHex = msg.data?.audio;
          if (audioHex) {
            try {
              const pcm = Buffer.from(audioHex, "hex");
              if (!firstAudioFired) {
                firstAudioFired = true;
                clearTimeout(firstAudioTimeout);
                await callbacks.onFirstAudio?.();
              }
              await callbacks.onPcmChunk(pcm);
            } catch (error) {
              finishFailure(error);
              return;
            }
          }
          if (msg.is_final) {
            await finishSuccess();
          }
          return;
        }
        case "task_finished": {
          await finishSuccess();
          return;
        }
        case "task_failed": {
          const code = msg.base_resp?.status_code ?? -6;
          const message = msg.base_resp?.status_msg || "MiniMax realtime synthesis failed";
          finishFailure(new TTSApiError(message, code));
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
        void finishSuccess();
      } else {
        finishFailure(new TTSApiError(`WebSocket closed unexpectedly: code=${event.code}`, -6));
      }
    });
  });
}

function buildTaskStart(options: TTSOptions): Record<string, unknown> {
  const voiceSetting: Record<string, unknown> = {
    voice_id: options.voice,
    speed: options.playbackRate,
    vol: options.volume,
    pitch: options.pitch,
    english_normalization: options.englishNormalization,
  };
  if (options.emotion) voiceSetting.emotion = options.emotion;

  const payload: Record<string, unknown> = {
    event: "task_start",
    model: options.model,
    voice_setting: voiceSetting,
    audio_setting: {
      sample_rate: options.sampleRate,
      bitrate: options.bitrate,
      // PCM streams as raw 16-bit little-endian samples; the player wraps each
      // chunk as a WAV header at the configured sample rate.
      format: "pcm",
      channel: options.channel,
    },
  };

  if (options.languageBoost && options.languageBoost !== "auto") {
    payload.language_boost = options.languageBoost;
  }

  return payload;
}

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

interface RealtimeEvent {
  event: string;
  data?: { audio?: string };
  is_final?: boolean;
  base_resp?: { status_code?: number; status_msg?: string };
}
