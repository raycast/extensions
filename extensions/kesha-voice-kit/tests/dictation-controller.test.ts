import { describe, expect, it, vi } from "vitest";
import {
  normalizeTranscribeResult,
  startDictationSession,
  startTranscribingTimer,
} from "../src/lib/dictation-controller";
import type {
  DictationControllerDeps,
  DictationState,
  RunningTask,
} from "../src/lib/dictation-types";
import { emptySignal } from "../src/lib/recording-view";

describe("dictation controller", () => {
  it("runs the happy path and copies the trimmed transcript", async () => {
    const deps = createDeps();
    const { states, toasts } = deps;
    const session = startDictationSession({}, deps.setState, deps);

    await session.done;

    expect(states.map((state) => state.status)).toEqual([
      "recording",
      "transcribing",
      "ok",
    ]);
    expect(deps.copyToClipboard).toHaveBeenCalledWith("hello world");
    expect(toasts).toEqual([
      {
        style: "animated",
        title: "Recording",
        message: "Stops automatically after 120s",
      },
      {
        style: "animated",
        title: "Transcribing",
        message: "dictation.wav",
      },
      { style: "success", title: "Copied transcript" },
    ]);
    expect(deps.cleanupTempDir).toHaveBeenCalledWith("/tmp/session");
  });

  it("does not transcribe silent audio and still cleans up", async () => {
    const deps = createDeps({
      isSilentAudio: vi.fn(async () => true),
    });
    const { states } = deps;

    const session = startDictationSession({}, deps.setState, deps);
    await session.done;

    expect(deps.startTranscriber).not.toHaveBeenCalled();
    expect(states.at(-1)).toMatchObject({
      status: "error",
      message:
        "Recorded audio is silent. Check macOS Microphone permission for Raycast and the selected input device.",
    });
    expect(deps.cleanupTempDir).toHaveBeenCalledWith("/tmp/session");
  });

  it("surfaces recorder failures and skips transcription", async () => {
    const deps = createDeps({
      startRecorder: vi.fn(() =>
        resolvedTask(Promise.reject(new Error("mic denied"))),
      ),
    });
    const { states } = deps;

    const session = startDictationSession({}, deps.setState, deps);
    await session.done;

    expect(deps.startTranscriber).not.toHaveBeenCalled();
    expect(states.at(-1)).toMatchObject({
      status: "error",
      message: "mic denied",
    });
  });

  it("shows an actionable error when kesha cannot be resolved", async () => {
    const deps = createDeps({
      resolveKesha: vi.fn(async () => null),
    });
    const { states } = deps;

    const session = startDictationSession({}, deps.setState, deps);
    await session.done;

    expect(deps.createTempDir).not.toHaveBeenCalled();
    expect(states.at(-1)).toEqual({
      status: "error",
      message: "kesha CLI not found.",
      hint: "install kesha",
    });
  });

  it("lets the user stop recording and cancels running work on unmount", async () => {
    const recorder = deferred<void>();
    const recorderStop = vi.fn();
    const transcriberStop = vi.fn();
    const deps = createDeps({
      startRecorder: vi.fn(() => ({
        done: recorder.promise,
        stop: recorderStop,
      })),
      startTranscriber: vi.fn(() => ({
        done: Promise.resolve("ignored"),
        stop: transcriberStop,
      })),
    });
    const { states } = deps;

    const session = startDictationSession({}, deps.setState, deps);
    await flushPromises();
    session.stopRecording();
    session.cancel();
    recorder.resolve();
    await session.done;

    expect(states.some((state) => state.status === "stopping")).toBe(true);
    expect(recorderStop).toHaveBeenCalled();
    expect(transcriberStop).not.toHaveBeenCalled();
  });

  it("does not start the recorder if unmounted before recorder creation", async () => {
    const recordingToast = deferred<void>();
    const deps = createDeps({
      showToast: vi.fn(async (toast) => {
        deps.toasts.push(toast);
        if (toast.title === "Recording") {
          await recordingToast.promise;
        }
      }),
    });

    const session = startDictationSession({}, deps.setState, deps);
    await vi.waitFor(() => expect(deps.current().status).toBe("recording"));

    session.cancel();
    recordingToast.resolve();
    await session.done;

    expect(deps.startRecorder).not.toHaveBeenCalled();
    expect(deps.cleanupTempDir).toHaveBeenCalledWith("/tmp/session");
  });

  it("keeps recording when the meter is unavailable", async () => {
    const recorder = deferred<void>();
    const deps = createDeps({
      startRecorder: vi.fn(() => resolvedTask(recorder.promise)),
      startRecordingMonitor: vi.fn((onPatch) => {
        onPatch({ signal: emptySignal("Meter unavailable", "unavailable") });
        return vi.fn();
      }),
    });
    const { current } = deps;

    const session = startDictationSession({}, deps.setState, deps);
    await flushPromises();

    expect(current()).toMatchObject({
      status: "recording",
      signal: {
        state: "unavailable",
        status: "Meter unavailable",
      },
    });

    recorder.resolve();
    await session.done;
    expect(deps.startTranscriber).toHaveBeenCalled();
  });

  it("shows transcribing elapsed state and can cancel transcription", async () => {
    const transcriber = deferred<string>();
    const transcriberStop = vi.fn();
    const deps = createDeps({
      startTranscriber: vi.fn(() => ({
        done: transcriber.promise,
        stop: transcriberStop,
      })),
    });
    const { states } = deps;

    const session = startDictationSession({}, deps.setState, deps);
    await vi.waitFor(() => expect(states.at(-1)?.status).toBe("transcribing"));

    expect(states.at(-1)).toMatchObject({
      status: "transcribing",
      elapsedSeconds: 0,
      timeoutSeconds: 60,
    });

    session.cancelTranscription();
    expect(transcriberStop).toHaveBeenCalled();
    expect(states.at(-1)).toEqual({
      status: "error",
      message: "Transcription cancelled.",
    });

    transcriber.resolve("ignored");
    await session.done;
  });
});

describe("normalizeTranscribeResult", () => {
  it("trims plain kesha stdout and rejects empty transcripts", () => {
    expect(normalizeTranscribeResult("/tmp/a.wav", " hello \n")).toEqual({
      file: "/tmp/a.wav",
      text: "hello",
    });
    expect(() => normalizeTranscribeResult("/tmp/a.wav", " \n")).toThrow(
      "No transcript returned.",
    );
  });
});

describe("startTranscribingTimer", () => {
  it("updates elapsed seconds only while state is transcribing", () => {
    vi.useFakeTimers();
    let now = 1_000;
    let state: DictationState = {
      status: "transcribing",
      elapsedSeconds: 0,
      timeoutSeconds: 60,
    };
    const states: DictationState[] = [];

    const stop = startTranscribingTimer(
      (next) => {
        state = typeof next === "function" ? next(state) : next;
        states.push(state);
      },
      { now: () => now },
    );

    now = 3_400;
    vi.advanceTimersByTime(500);
    stop();

    expect(states.at(-1)).toMatchObject({
      status: "transcribing",
      elapsedSeconds: 2,
    });
    vi.useRealTimers();
  });
});

function createDeps(
  overrides: Partial<DictationControllerDeps> = {},
): DictationControllerDeps & {
  setState: (
    next: DictationState | ((state: DictationState) => DictationState),
  ) => void;
  states: DictationState[];
  current: () => DictationState;
  toasts: unknown[];
} {
  let current: DictationState = { status: "starting" };
  const states: DictationState[] = [];
  const toasts: unknown[] = [];
  const deps: DictationControllerDeps = {
    resolveKesha: vi.fn(async () => ({ command: "kesha", prefixArgs: [] })),
    notFoundMessage: () => "install kesha",
    createTempDir: vi.fn(async () => "/tmp/session"),
    cleanupTempDir: vi.fn(async () => undefined),
    audioPathForTempDir: (dir) => `${dir}/dictation.wav`,
    audioBasename: (path) => path.split("/").at(-1) ?? path,
    startRecordingMonitor: vi.fn(() => vi.fn()),
    startRecorder: vi.fn(() => resolvedTask(Promise.resolve())),
    startTranscriber: vi.fn(() =>
      resolvedTask(Promise.resolve(" hello world\n")),
    ),
    isSilentAudio: vi.fn(async () => false),
    copyToClipboard: vi.fn(async () => undefined),
    showToast: vi.fn(async (toast) => {
      toasts.push(toast);
    }),
    ...overrides,
  };
  return {
    ...deps,
    setState: (next) => {
      current = typeof next === "function" ? next(current) : next;
      states.push(current);
    },
    states,
    current: () => current,
    toasts,
  };
}

function resolvedTask<T>(done: Promise<T>): RunningTask<T> {
  return { done, stop: vi.fn() };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
