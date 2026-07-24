import { describe, expect, it, vi } from "vitest";
import {
  createSilenceTracker,
  normalizeTranscribeResult,
  startDictationSession,
  startTranscribingTimer,
} from "../src/lib/dictation-controller";
import type {
  DictationControllerDeps,
  DictationState,
  RecordingPatch,
  RunningTask,
  SignalLevel,
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
        message: "Stops automatically when you pause",
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

  it("does not start the recorder when stop is requested during the recording toast", async () => {
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

    session.stopRecording();
    expect(deps.startRecorder).not.toHaveBeenCalled();
    expect(deps.states.some((state) => state.status === "stopping")).toBe(true);

    recordingToast.resolve();
    await session.done;

    expect(deps.startRecorder).not.toHaveBeenCalled();
    expect(deps.startTranscriber).not.toHaveBeenCalled();
    expect(deps.current()).toMatchObject({
      status: "error",
      message: "Recording stopped before any audio was captured.",
    });
    expect(deps.cleanupTempDir).toHaveBeenCalledWith("/tmp/session");
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

  it("auto-stops and transcribes after continuous silence", async () => {
    let clock = 0;
    let emit!: (patch: RecordingPatch) => void;
    const recorder = deferred<void>();
    const recorderStop = vi.fn(() => recorder.resolve());
    const deps = createDeps({
      now: () => clock,
      startRecorder: vi.fn(() => ({
        done: recorder.promise,
        stop: recorderStop,
      })),
      startRecordingMonitor: vi.fn((onPatch) => {
        emit = onPatch;
        return vi.fn();
      }),
    });

    const session = startDictationSession({}, deps.setState, deps);
    await vi.waitFor(() => expect(deps.startRecorder).toHaveBeenCalled());

    emit({ signal: listeningSignal() });
    clock = 30_000;
    emit({ signal: listeningSignal() });
    expect(deps.current()).toMatchObject({ status: "recording", idle: true });
    expect(recorderStop).not.toHaveBeenCalled();

    clock = 45_000;
    emit({ signal: listeningSignal() });
    expect(recorderStop).toHaveBeenCalledTimes(1);

    await session.done;
    expect(deps.startTranscriber).toHaveBeenCalled();
    expect(deps.toasts).toContainEqual({
      style: "animated",
      title: "Stopped after silence.",
    });
  });

  it("clears the idle warning when speech returns before the grace stop", async () => {
    let clock = 0;
    let emit!: (patch: RecordingPatch) => void;
    const recorder = deferred<void>();
    const recorderStop = vi.fn(() => recorder.resolve());
    const deps = createDeps({
      now: () => clock,
      startRecorder: vi.fn(() => ({
        done: recorder.promise,
        stop: recorderStop,
      })),
      startRecordingMonitor: vi.fn((onPatch) => {
        emit = onPatch;
        return vi.fn();
      }),
    });

    const session = startDictationSession({}, deps.setState, deps);
    await vi.waitFor(() => expect(deps.startRecorder).toHaveBeenCalled());

    emit({ signal: listeningSignal() });
    clock = 30_000;
    emit({ signal: listeningSignal() });
    expect(deps.current()).toMatchObject({ idle: true });

    clock = 44_000;
    emit({ signal: signalTick() });
    expect(deps.current()).toMatchObject({
      status: "recording",
      idle: false,
      silentForMs: 0,
    });

    clock = 90_000;
    emit({ signal: listeningSignal() });
    expect(recorderStop).not.toHaveBeenCalled();

    session.cancel();
    await session.done;
  });

  it("does not accumulate silence while the meter is still starting", async () => {
    let clock = 0;
    let emit!: (patch: RecordingPatch) => void;
    const recorder = deferred<void>();
    const recorderStop = vi.fn(() => recorder.resolve());
    const deps = createDeps({
      now: () => clock,
      startRecorder: vi.fn(() => ({
        done: recorder.promise,
        stop: recorderStop,
      })),
      startRecordingMonitor: vi.fn((onPatch) => {
        emit = onPatch;
        return vi.fn();
      }),
    });

    const session = startDictationSession({}, deps.setState, deps);
    await vi.waitFor(() => expect(deps.startRecorder).toHaveBeenCalled());

    emit({ signal: emptySignal("Starting microphone meter...", "starting") });
    clock = 60_000;
    emit({ signal: emptySignal("Starting microphone meter...", "starting") });
    expect(deps.current()).toMatchObject({ idle: false, silentForMs: 0 });
    expect(recorderStop).not.toHaveBeenCalled();

    session.cancel();
    await session.done;
  });
});

describe("createSilenceTracker", () => {
  it("accumulates silence across listening ticks and warns at 30s", () => {
    let clock = 0;
    const tracker = createSilenceTracker({
      now: () => clock,
      onIdleStop: vi.fn(),
    });

    expect(tracker.track({ signal: listeningSignal() })).toMatchObject({
      silentForMs: 0,
      idle: false,
    });
    clock = 29_999;
    expect(tracker.track({ signal: listeningSignal() })).toMatchObject({
      idle: false,
    });
    clock = 30_000;
    expect(tracker.track({ signal: listeningSignal() })).toMatchObject({
      silentForMs: 30_000,
      idle: true,
    });
  });

  it("fires the idle stop once at the grace ceiling", () => {
    let clock = 0;
    const onIdleStop = vi.fn();
    const tracker = createSilenceTracker({ now: () => clock, onIdleStop });

    tracker.track({ signal: listeningSignal() });
    clock = 45_000;
    tracker.track({ signal: listeningSignal() });
    clock = 60_000;
    tracker.track({ signal: listeningSignal() });

    expect(onIdleStop).toHaveBeenCalledTimes(1);
  });

  it("resets the silence timer on a signal tick", () => {
    let clock = 0;
    const onIdleStop = vi.fn();
    const tracker = createSilenceTracker({ now: () => clock, onIdleStop });

    tracker.track({ signal: listeningSignal() });
    clock = 44_000;
    expect(tracker.track({ signal: signalTick() })).toMatchObject({
      silentForMs: 0,
      idle: false,
    });
    clock = 80_000;
    expect(tracker.track({ signal: listeningSignal() })).toMatchObject({
      silentForMs: 0,
      idle: false,
    });
    expect(onIdleStop).not.toHaveBeenCalled();
  });

  it("leaves non-signal patches untouched", () => {
    const tracker = createSilenceTracker({ onIdleStop: vi.fn() });
    expect(tracker.track({ elapsedSeconds: 5 })).toEqual({ elapsedSeconds: 5 });
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

function listeningSignal(): SignalLevel {
  return {
    rms: 0,
    peak: 0,
    percent: 0,
    state: "listening",
    status: "Listening...",
  };
}

function signalTick(): SignalLevel {
  return {
    rms: 0.02,
    peak: 0.05,
    percent: 24,
    state: "signal",
    status: "Signal detected",
  };
}
