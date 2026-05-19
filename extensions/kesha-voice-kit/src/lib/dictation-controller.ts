import { join, basename } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { parseMaxSeconds } from "./dictation-config";
import { notFoundMessage, resolveKeshaBin, type KeshaSpawn } from "./kesha-bin";
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
  let tempDir: string | null = null;
  let stopMonitoring: (() => void) | null = null;
  let recorder: RunningTask<void> | null = null;
  let transcriber: RunningTask<string> | null = null;

  const session: DictationSession = {
    stopRecording: () => {
      setState({ status: "stopping" });
      recorder?.stop();
    },
    cancel: () => {
      cancelled = true;
      recorder?.stop();
      transcriber?.stop();
      stopMonitoring?.();
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
        mic: { name: "Default input device" },
        signal: emptySignal("Starting microphone meter...", "starting"),
      });
      stopMonitoring = deps.startRecordingMonitor((patch) =>
        patchRecordingState(setState, patch),
      );
      await deps.showToast({
        style: "animated",
        title: "Recording",
        message: `Stops automatically after ${maxSeconds}s`,
      });

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

      setState({ status: "transcribing" });
      await deps.showToast({
        style: "animated",
        title: "Transcribing",
        message: deps.audioBasename(audioPath),
      });

      transcriber = deps.startTranscriber(kesha, audioPath);
      const result = normalizeTranscribeResult(
        audioPath,
        await transcriber.done,
      );
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

export function startRecorderTask(
  kesha: KeshaSpawn,
  audioPath: string,
  maxSeconds: number,
): RunningTask<void> {
  return startKeshaRecorder(kesha, audioPath, maxSeconds);
}
