import { join, basename } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  IDLE_STOP_GRACE_MS,
  IDLE_WARN_MS,
  parseMaxSeconds,
  TRANSCRIBE_TIMEOUT_SECONDS,
} from "./dictation-config";
import { notFoundMessage, resolveKeshaBin } from "./kesha-bin";
import { startKeshaRecorder, startKeshaTranscriber } from "./process-tasks";
import { startRecordingMonitor } from "./recording-monitor";
import { emptySignal } from "./recording-view";
import type {
  DictationControllerDeps,
  DictationPrefs,
  DictationSession,
  DictationState,
  RecordingPatch,
  RunningTask,
  TranscribeResult,
} from "./dictation-types";
import { isSilentWavFile } from "./wav";

export type DictationStateSetter = (
  next: DictationState | ((current: DictationState) => DictationState),
) => void;

export function startDictationSession(
  prefs: DictationPrefs,
  setState: DictationStateSetter,
  deps: DictationControllerDeps,
): DictationSession {
  let cancelled = false;
  let stopRequested = false;
  let tempDir: string | null = null;
  let stopMonitoring: (() => void) | null = null;
  let recorder: RunningTask<void> | null = null;
  let transcriber: RunningTask<string> | null = null;
  let stopTranscribeTimer: (() => void) | null = null;

  const session: DictationSession = {
    stopRecording: () => {
      stopRequested = true;
      setState({ status: "stopping" });
      recorder?.stop();
    },
    cancelTranscription: () => {
      cancelled = true;
      transcriber?.stop();
      stopTranscribeTimer?.();
      setState({ status: "error", message: "Transcription cancelled." });
    },
    cancel: () => {
      cancelled = true;
      recorder?.stop();
      transcriber?.stop();
      stopMonitoring?.();
      stopTranscribeTimer?.();
    },
    done: Promise.resolve(),
  };

  session.done = run();
  return session;

  async function run() {
    try {
      const maxSeconds = parseMaxSeconds(prefs.maxRecordingSeconds);
      const kesha = await deps.resolveKesha(prefs.keshaBinPath);
      if (!kesha) {
        setState({
          status: "error",
          message: "kesha CLI not found.",
          hint: deps.notFoundMessage(),
        });
        return;
      }

      tempDir = await deps.createTempDir();
      const audioPath = deps.audioPathForTempDir(tempDir);

      setState({
        status: "recording",
        maxSeconds,
        elapsedSeconds: 0,
        silentForMs: 0,
        idle: false,
        mic: { name: "Default input device" },
        signal: emptySignal("Starting microphone meter...", "starting"),
      });
      const silenceTracker = createSilenceTracker({
        now: deps.now,
        onIdleStop: () => {
          void deps.showToast({
            style: "animated",
            title: "Stopped after silence.",
          });
          recorder?.stop();
        },
      });
      stopMonitoring = deps.startRecordingMonitor((patch) =>
        patchRecordingState(setState, silenceTracker.track(patch)),
      );
      await deps.showToast({
        style: "animated",
        title: "Recording",
        message: "Stops automatically when you pause",
      });
      if (cancelled) return;
      if (stopRequested) {
        setState({
          status: "error",
          message: "Recording stopped before any audio was captured.",
        });
        return;
      }

      recorder = deps.startRecorder(kesha, audioPath, maxSeconds);
      try {
        await recorder.done;
      } finally {
        recorder = null;
        stopMonitoring?.();
        stopMonitoring = null;
      }
      if (cancelled) return;

      if (await deps.isSilentAudio(audioPath)) {
        throw new Error(
          "Recorded audio is silent. Check macOS Microphone permission for Raycast and the selected input device.",
        );
      }

      setState({
        status: "transcribing",
        elapsedSeconds: 0,
        timeoutSeconds: TRANSCRIBE_TIMEOUT_SECONDS,
      });
      await deps.showToast({
        style: "animated",
        title: "Transcribing",
        message: deps.audioBasename(audioPath),
      });

      stopTranscribeTimer = startTranscribingTimer(setState);
      transcriber = deps.startTranscriber(kesha, audioPath);
      const result = normalizeTranscribeResult(
        audioPath,
        await transcriber.done,
      );
      stopTranscribeTimer?.();
      stopTranscribeTimer = null;
      transcriber = null;
      if (cancelled) return;

      const transcript = result.text.trim();
      if (!transcript) {
        throw new Error("No speech was detected in the recording.");
      }
      await deps.copyToClipboard(transcript);
      await deps.showToast({
        style: "success",
        title: "Copied transcript",
      });
      setState({
        status: "ok",
        result: { ...result, text: transcript },
      });
    } catch (err: unknown) {
      if (cancelled) return;
      await deps.showToast({ style: "failure", title: "Dictation failed" });
      setState({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      recorder = null;
      transcriber = null;
      stopMonitoring?.();
      stopMonitoring = null;
      stopTranscribeTimer?.();
      stopTranscribeTimer = null;
      if (tempDir) await deps.cleanupTempDir(tempDir);
    }
  }
}

export function createDefaultDictationDeps(
  adapter: Pick<DictationControllerDeps, "copyToClipboard" | "showToast">,
): DictationControllerDeps {
  return {
    ...adapter,
    resolveKesha: resolveKeshaBin,
    notFoundMessage,
    createTempDir: () => mkdtemp(join(tmpdir(), "raycast-kesha-dictate-")),
    cleanupTempDir: (dir) => rm(dir, { recursive: true, force: true }),
    audioPathForTempDir: (dir) => join(dir, "dictation.wav"),
    audioBasename: basename,
    startRecordingMonitor,
    startRecorder: (kesha, audioPath, maxSeconds) =>
      startKeshaRecorder(kesha, audioPath, maxSeconds),
    startTranscriber: (kesha, audioPath) =>
      startKeshaTranscriber(kesha, audioPath),
    isSilentAudio: isSilentWavFile,
  };
}

export interface SilenceTrackerDeps {
  onIdleStop: () => void;
  now?: () => number;
}

export function createSilenceTracker(deps: SilenceTrackerDeps): {
  track: (patch: RecordingPatch) => RecordingPatch;
} {
  const now = deps.now ?? Date.now;
  let silenceStartedAt: number | null = null;
  let idleStopTriggered = false;

  return {
    track: (patch) => {
      const state = patch.signal?.state;
      if (!state) return patch;
      if (state !== "listening") {
        silenceStartedAt = null;
        return { ...patch, silentForMs: 0, idle: false };
      }
      if (silenceStartedAt === null) silenceStartedAt = now();
      const silentForMs = Math.max(0, now() - silenceStartedAt);
      if (
        silentForMs >= IDLE_WARN_MS + IDLE_STOP_GRACE_MS &&
        !idleStopTriggered
      ) {
        idleStopTriggered = true;
        deps.onIdleStop();
      }
      return { ...patch, silentForMs, idle: silentForMs >= IDLE_WARN_MS };
    },
  };
}

export function patchRecordingState(
  setState: DictationStateSetter,
  patch: RecordingPatch,
) {
  setState((current) => {
    if (current.status !== "recording") return current;
    return { ...current, ...patch };
  });
}

export function normalizeTranscribeResult(
  audioPath: string,
  stdout: string,
): TranscribeResult {
  const text = stdout.trim();
  if (!text) {
    throw new Error("No transcript returned.");
  }
  return { file: audioPath, text };
}

export function startTranscribingTimer(
  setState: DictationStateSetter,
  deps: {
    now?: () => number;
    setInterval?: typeof setInterval;
    clearInterval?: typeof clearInterval;
  } = {},
): () => void {
  const now = deps.now ?? Date.now;
  const schedule = deps.setInterval ?? setInterval;
  const unschedule = deps.clearInterval ?? clearInterval;
  const startedAt = now();
  const tick = () => {
    setState((current) => {
      if (current.status !== "transcribing") return current;
      return {
        ...current,
        elapsedSeconds: Math.max(0, Math.floor((now() - startedAt) / 1000)),
      };
    });
  };
  const timer = schedule(tick, 500);
  return () => unschedule(timer);
}
