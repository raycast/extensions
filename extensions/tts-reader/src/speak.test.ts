import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getPreferenceValuesMock = vi.fn();
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => getPreferenceValuesMock(),
}));

const isFfplayAvailableMock = vi.fn();
const startStdinPlaybackMock = vi.fn();
vi.mock("./playback-controller", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./playback-controller")>();
  return {
    ...actual,
    isFfplayAvailable: (...args: unknown[]) => isFfplayAvailableMock(...args),
    startStdinPlayback: (...args: unknown[]) => startStdinPlaybackMock(...args),
  };
});

const detectGatewayMock = vi.fn();
const createSpeechMock = vi.fn();
const playMock = vi.fn();
vi.mock("./play", () => ({
  play: (...args: unknown[]) => playMock(...args),
}));
const registerStreamSessionMock = vi.fn();
const clearStreamSessionMock = vi.fn();
const readStreamSessionMock = vi.fn();
const requestStreamStopMock = vi.fn();
const shouldStopStreamMock = vi.fn();
vi.mock("./stream-stop", () => ({
  registerStreamSession: (...args: unknown[]) => registerStreamSessionMock(...args),
  clearStreamSession: (...args: unknown[]) => clearStreamSessionMock(...args),
  readStreamSession: (...args: unknown[]) => readStreamSessionMock(...args),
  requestStreamStop: (...args: unknown[]) => requestStreamStopMock(...args),
  shouldStopStream: (...args: unknown[]) => shouldStopStreamMock(...args),
  startStreamStopPolling: (sessionId: string, abortController: AbortController, intervalMs = 10) => {
    const interval = setInterval(() => {
      void shouldStopStreamMock(sessionId).then((shouldStop: boolean) => {
        if (shouldStop) {
          abortController.abort();
        }
      });
    }, intervalMs);
    return () => clearInterval(interval);
  },
}));
vi.mock("./tts-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tts-utils")>();
  return {
    ...actual,
    detectGateway: (...args: unknown[]) => detectGatewayMock(...args),
    createSpeech: (...args: unknown[]) => createSpeechMock(...args),
  };
});

function pcmResponseHeaders(): Record<string, string> {
  return {
    "content-type": "audio/raw",
    "x-tts-mode": "stream-pcm",
    "x-tts-primary-engine": "kokoro",
    "x-tts-sample-rate": "24000",
    "x-tts-channels": "1",
    "x-tts-sample-width": "2",
    "x-tts-pcm-format": "s16le",
  };
}

function mp3ResponseHeaders(): Record<string, string> {
  return {
    "content-type": "audio/mpeg",
    "x-tts-mode": "stream",
    "x-tts-primary-engine": "kokoro",
  };
}

function streamResponse(status: number, headers: Record<string, string>, body = "audio-bytes"): Response {
  return new Response(body, { status, headers });
}

describe("speakText gateway streaming", () => {
  beforeEach(() => {
    getPreferenceValuesMock.mockReturnValue({
      serverUrl: "http://localhost:8000",
      voice: "",
      speed: "1.0",
      saveAudioFiles: false,
    });
    detectGatewayMock.mockResolvedValue(true);
    isFfplayAvailableMock.mockResolvedValue(true);
    startStdinPlaybackMock.mockResolvedValue("finished");
    let sessionCounter = 0;
    registerStreamSessionMock.mockImplementation(async () => `session-${++sessionCounter}`);
    clearStreamSessionMock.mockResolvedValue(undefined);
    readStreamSessionMock.mockResolvedValue(null);
    requestStreamStopMock.mockResolvedValue(undefined);
    shouldStopStreamMock.mockResolvedValue(false);
    createSpeechMock.mockResolvedValue({
      audio: Buffer.from("buffered-audio"),
      format: "mp3",
      engine: "kokoro",
    });
    playMock.mockResolvedValue({ warnings: [], completion: "finished" });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("tries PCM streaming first for gateway servers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamResponse(200, pcmResponseHeaders()))
      .mockResolvedValueOnce(streamResponse(200, mp3ResponseHeaders()));
    vi.stubGlobal("fetch", fetchMock);

    const { speakText } = await import("./speak");
    const result = await speakText("Hello");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/tts/stream/pcm",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "Hello" }),
      }),
    );
    expect(startStdinPlaybackMock).toHaveBeenCalledWith(expect.any(Function), expect.any(AbortController), [
      "-nodisp",
      "-autoexit",
      "-loglevel",
      "error",
      "-f",
      "s16le",
      "-ar",
      "24000",
      "-ac",
      "1",
      "-i",
      "-",
    ]);
    expect(result.engine).toBe("kokoro");
    expect(result.completion).toBe("finished");
  });

  it("falls back to MP3 streaming when PCM returns 404", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamResponse(404, {}))
      .mockResolvedValueOnce(streamResponse(200, mp3ResponseHeaders()));
    vi.stubGlobal("fetch", fetchMock);

    const { speakText } = await import("./speak");
    await speakText("Hello");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:8000/tts/stream/pcm", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:8000/tts/stream", expect.any(Object));
    expect(startStdinPlaybackMock).toHaveBeenCalledWith(expect.any(Function), expect.any(AbortController), [
      "-nodisp",
      "-autoexit",
      "-loglevel",
      "error",
      "-i",
      "-",
    ]);
  });

  it("falls back to MP3 streaming when PCM metadata is unsupported", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamResponse(200, {
          ...pcmResponseHeaders(),
          "x-tts-pcm-format": "f32le",
        }),
      )
      .mockResolvedValueOnce(streamResponse(200, mp3ResponseHeaders()));
    vi.stubGlobal("fetch", fetchMock);

    const { speakText } = await import("./speak");
    await speakText("Hello");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(startStdinPlaybackMock).toHaveBeenCalledWith(expect.any(Function), expect.any(AbortController), [
      "-nodisp",
      "-autoexit",
      "-loglevel",
      "error",
      "-i",
      "-",
    ]);
  });

  it("does not fall back to MP3 when PCM returns 503", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(streamResponse(503, {}));
    vi.stubGlobal("fetch", fetchMock);

    const { speakText } = await import("./speak");
    await expect(speakText("Hello")).rejects.toThrow("No TTS engines available");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(startStdinPlaybackMock).not.toHaveBeenCalled();
  });

  it("falls back to buffered playback when streaming routes are unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamResponse(404, {}))
      .mockResolvedValueOnce(streamResponse(404, {}));
    vi.stubGlobal("fetch", fetchMock);

    const { speakText } = await import("./speak");
    const result = await speakText("Hello");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:8000/tts/stream/pcm", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:8000/tts/stream", expect.any(Object));
    expect(createSpeechMock).toHaveBeenCalledWith("Hello");
    expect(playMock).toHaveBeenCalledWith(Buffer.from("buffered-audio"), "mp3");
    expect(startStdinPlaybackMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      warnings: ["Gateway streaming unavailable - buffered playback used"],
      completion: "finished",
      engine: "kokoro",
    });
  });

  it("aborts the first in-flight streaming request when a second speakText starts", async () => {
    let firstSignal: AbortSignal | undefined;
    let resolveFirstFetch!: (value: Response) => void;
    let releaseFirstFetchStarted!: () => void;
    const firstFetchStarted = new Promise<void>((resolve) => {
      releaseFirstFetchStarted = resolve;
    });
    const firstFetchPromise = new Promise<Response>((resolve) => {
      resolveFirstFetch = resolve;
    });

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (!firstSignal) {
        firstSignal = init?.signal ?? undefined;
        releaseFirstFetchStarted();
        return firstFetchPromise;
      }
      return Promise.resolve(streamResponse(200, pcmResponseHeaders()));
    });
    vi.stubGlobal("fetch", fetchMock);

    const { speakText } = await import("./speak");
    const firstPromise = speakText("First");
    await firstFetchStarted;
    const secondPromise = speakText("Second");

    await vi.waitFor(() => {
      expect(firstSignal?.aborted).toBe(true);
    });

    resolveFirstFetch(streamResponse(200, pcmResponseHeaders()));

    const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);

    expect(firstResult.completion).toBe("stopped");
    expect(secondResult.completion).toBe("finished");
    expect(startStdinPlaybackMock).toHaveBeenCalledTimes(1);
  });

  it("returns stopped when abortActiveStreamingRequest cancels an in-flight fetch", async () => {
    let resolveFetch!: (value: Response) => void;
    let releaseFetchStarted!: () => void;
    const fetchStarted = new Promise<void>((resolve) => {
      releaseFetchStarted = resolve;
    });
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = vi.fn(() => {
      releaseFetchStarted();
      return fetchPromise;
    });
    vi.stubGlobal("fetch", fetchMock);

    const { speakText } = await import("./speak");
    const { abortActiveStreamingRequest } = await import("./stream-session");
    const speakPromise = speakText("Hello");

    await fetchStarted;
    expect(await abortActiveStreamingRequest()).toBe(true);

    resolveFetch(streamResponse(200, pcmResponseHeaders()));

    await expect(speakPromise).resolves.toEqual({
      warnings: [],
      completion: "stopped",
    });
    expect(startStdinPlaybackMock).not.toHaveBeenCalled();
  });

  it("writes a cross-process stop marker when abortActiveStreamingRequest finds a session file", async () => {
    readStreamSessionMock.mockResolvedValue({ sessionId: "session-remote" });

    const { abortActiveStreamingRequest } = await import("./stream-session");
    await expect(abortActiveStreamingRequest()).resolves.toBe(true);
    expect(requestStreamStopMock).toHaveBeenCalledWith("session-remote");
  });

  it("aborts an in-flight streaming fetch when a cross-process stop marker appears", async () => {
    registerStreamSessionMock.mockResolvedValue("session-cross");
    readStreamSessionMock.mockResolvedValue({ sessionId: "session-cross" });

    let releaseFetchStarted!: () => void;
    const fetchStarted = new Promise<void>((resolve) => {
      releaseFetchStarted = resolve;
    });

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      releaseFetchStarted();
      return new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { speakText } = await import("./speak");
    const speakPromise = speakText("Hello");

    await fetchStarted;
    shouldStopStreamMock.mockResolvedValue(true);

    await expect(speakPromise).resolves.toEqual({
      warnings: [],
      completion: "stopped",
    });
    expect(startStdinPlaybackMock).not.toHaveBeenCalled();
  });
});
