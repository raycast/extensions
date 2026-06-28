import { getPreferenceValues } from "@raycast/api";
import { buildPcmFfplayArgs, parsePcmStreamHeaders } from "./pcm-stream";
import { DEFAULT_STDIN_FFPLAY_ARGS, isFfplayAvailable, startStdinPlayback } from "./playback-controller";
import { parseSpeed, resolvePlaybackMode, shouldProbeFfplay } from "./playback-mode";
import { play } from "./play";
import { createSpeech, detectGateway, gatewayErrorMessage, getConfigError } from "./tts-utils";
import { DEFAULT_SERVER_URL, parseServerUrl } from "./server-url";
import {
  beginStreamingSession,
  endStreamingSession,
  isActiveStreamingSession,
  StreamingSession,
} from "./stream-session";
import { Preferences } from "./types";

export type SpeakResult = {
  warnings: string[];
  completion: "finished" | "stopped";
  engine?: string;
};

const GATEWAY_PCM_STREAM_PATH = "/tts/stream/pcm";
const GATEWAY_MP3_STREAM_PATH = "/tts/stream";
const STREAM_UNAVAILABLE_WARNING = "Gateway streaming unavailable - buffered playback used";

export async function speakText(text: string): Promise<SpeakResult> {
  const preferences = getPreferenceValues<Preferences>();
  const configError = getConfigError(preferences);
  if (configError) {
    throw new Error(configError);
  }

  const { baseUrl, hasCustomPath } = parseServerUrl(preferences.serverUrl ?? DEFAULT_SERVER_URL);
  const isGateway = hasCustomPath ? false : await detectGateway(baseUrl);
  const speed = parseSpeed(preferences.speed);
  const saveAudioFiles = preferences.saveAudioFiles ?? false;
  const ffplayAvailable = shouldProbeFfplay({ isGateway, hasCustomPath, saveAudioFiles, speed })
    ? await isFfplayAvailable()
    : false;
  const { mode, warnings } = resolvePlaybackMode({
    isGateway,
    hasCustomPath,
    saveAudioFiles,
    speed,
    ffplayAvailable,
  });

  if (mode === "stream") {
    const result = await speakViaStream(text, baseUrl, preferences.voice?.trim());
    if (result.kind === "fallback") {
      return await speakBuffered(text, [...warnings, STREAM_UNAVAILABLE_WARNING]);
    }

    return { ...result.result, warnings: [...warnings, ...result.result.warnings] };
  }

  return await speakBuffered(text, warnings);
}

async function speakBuffered(text: string, warnings: string[]): Promise<SpeakResult> {
  const { audio, format, engine } = await createSpeech(text);
  const result = await play(audio, format);
  return { warnings: [...warnings, ...result.warnings], completion: result.completion, engine };
}

function supersededStreamResult(): SpeakResult {
  return { warnings: [], completion: "stopped" };
}

type StreamCascadeResult = { kind: "success"; result: SpeakResult } | { kind: "fallback" };

async function speakViaStream(text: string, baseUrl: string, voice?: string): Promise<StreamCascadeResult> {
  const session = await beginStreamingSession();

  try {
    const payload = buildStreamPayload(text, voice);
    for (const format of GATEWAY_STREAM_FORMATS) {
      if (!isActiveStreamingSession(session.generation)) {
        return { kind: "success", result: supersededStreamResult() };
      }

      const attempt = await fetchGatewayStreamAttempt(baseUrl, payload, session, format);
      if (attempt.kind === "success") {
        return attempt;
      }
      if (attempt.kind === "superseded") {
        return { kind: "success", result: supersededStreamResult() };
      }
    }

    return { kind: "fallback" };
  } finally {
    endStreamingSession(session);
  }
}

type StreamAttempt = { kind: "success"; result: SpeakResult } | { kind: "fallback" } | { kind: "superseded" };

type GatewayStreamFormat = {
  path: string;
  ffplayArgsForResponse: (response: Response) => string[] | null;
  emptyBodyIsFallback: boolean;
};

const GATEWAY_STREAM_FORMATS: GatewayStreamFormat[] = [
  {
    path: GATEWAY_PCM_STREAM_PATH,
    ffplayArgsForResponse: pcmFfplayArgsForResponse,
    emptyBodyIsFallback: true,
  },
  {
    path: GATEWAY_MP3_STREAM_PATH,
    ffplayArgsForResponse: () => DEFAULT_STDIN_FFPLAY_ARGS,
    emptyBodyIsFallback: false,
  },
];

function isStreamUnavailableStatus(status: number): boolean {
  return status === 404 || status === 405 || status === 501;
}

function isFetchAborted(error: unknown, abortController: AbortController): boolean {
  return (
    abortController.signal.aborted ||
    (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
  );
}

async function fetchGatewayStreamAttempt(
  baseUrl: string,
  payload: StreamPayload,
  session: StreamingSession,
  format: GatewayStreamFormat,
): Promise<StreamAttempt> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${format.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: session.abortController.signal,
    });
  } catch (error) {
    if (isFetchAborted(error, session.abortController)) {
      return { kind: "superseded" };
    }
    throw error;
  }

  if (!response.ok) {
    await discardResponseBody(response);
    if (isStreamUnavailableStatus(response.status)) {
      return { kind: "fallback" };
    }
    throw new Error(gatewayErrorMessage(response.status));
  }

  const body = response.body;
  const ffplayArgs = format.ffplayArgsForResponse(response);
  if (!body || !ffplayArgs) {
    await discardResponseBody(response);
    if (format.emptyBodyIsFallback) {
      return { kind: "fallback" };
    }
    throw new Error("TTS server returned empty stream");
  }

  if (!isActiveStreamingSession(session.generation)) {
    await discardResponseBody(response);
    return { kind: "superseded" };
  }

  const engine = response.headers.get("x-tts-primary-engine") || undefined;
  const completion = await startStdinPlayback(
    async (stdin, abortSignal) => {
      await pumpReadableStream(body, stdin, abortSignal);
    },
    session.abortController,
    ffplayArgs,
  );

  return {
    kind: "success",
    result: { warnings: [], completion, engine },
  };
}

function pcmFfplayArgsForResponse(response: Response): string[] | null {
  const metadata = parsePcmStreamHeaders(response.headers);
  return metadata ? buildPcmFfplayArgs(metadata) : null;
}

type StreamPayload = { text: string; voice?: string };

function buildStreamPayload(text: string, voice?: string): StreamPayload {
  const payload: StreamPayload = { text };
  if (voice) {
    payload.voice = voice;
  }
  return payload;
}

async function discardResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Body may already be consumed or closed.
  }
}

async function pumpReadableStream(
  body: ReadableStream<Uint8Array>,
  stdin: NodeJS.WritableStream,
  abortSignal: AbortSignal,
): Promise<void> {
  const reader = body.getReader();

  try {
    while (!abortSignal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value || abortSignal.aborted) {
        break;
      }

      const canContinue = stdin.write(value);
      if (!canContinue) {
        await new Promise<void>((resolve, reject) => {
          const onDrain = () => {
            stdin.off("error", onError);
            resolve();
          };
          const onError = (error: NodeJS.ErrnoException) => {
            stdin.off("drain", onDrain);
            if (abortSignal.aborted || error.code === "EPIPE") {
              resolve();
              return;
            }
            reject(error);
          };
          stdin.once("drain", onDrain);
          stdin.once("error", onError);
        });
      }
    }
  } catch (error) {
    if (abortSignal.aborted || (error instanceof Error && "code" in error && error.code === "EPIPE")) {
      return;
    }
    throw error;
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Stream may already be closed after abort or ffplay exit.
    }
    reader.releaseLock();
    stdin.end();
  }
}
