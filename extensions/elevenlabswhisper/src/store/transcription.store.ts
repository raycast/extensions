import path from "node:path";
import { create } from "zustand";
import { shallow } from "zustand/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { TranscriptionStatus, TranscriptionStore } from "./types";
import { audioService, WAV_HEADER_SIZE } from "../services/audio.service";
import { transcriptionService } from "../services/transcription.service";
import { storageService } from "../services/storage.service";

const recordingFailedMessage = (message: string): string => `Recording failed: ${message}`;

export const useTranscriptionStore = create<TranscriptionStore>()((set, get) => ({
  status: "idle",
  transcript: undefined,
  error: undefined,
  filePath: undefined,
  _soxProcess: undefined,
  _currentFilePath: undefined,
  _transitionLock: false,

  startRecording: async () => {
    const state = get();
    if (state._transitionLock || state.status !== "idle") {
      return;
    }

    set({ _transitionLock: true });

    try {
      set({
        status: "recording",
        error: undefined,
        transcript: undefined,
      });

      await storageService.ensureRecordingsDir();
      const filename = storageService.getRecordingFilename();
      const outputPath = path.join(storageService.recordingsDir, filename);
      set({ _currentFilePath: outputPath });

      const { proc, outputPath: resolvedPath } = await audioService.start({
        outputPath,
      });
      set({ _soxProcess: proc, filePath: resolvedPath });

      proc.on("error", (error) => {
        console.error("SOX process error:", error);
        const current = get();
        current._cleanupSoxProcess();
        current._cleanupFile();
        set({
          status: "idle",
          error: recordingFailedMessage(error instanceof Error ? error.message : "SOX process error"),
        });
      });

      proc.on("exit", (code, signal) => {
        const currentState = get();
        if (currentState.status === "recording" && code !== 0) {
          const cleanupState = get();
          cleanupState._cleanupSoxProcess();
          cleanupState._cleanupFile();
          set({
            status: "idle",
            error: recordingFailedMessage(`SOX exited unexpectedly (code=${code}, signal=${signal ?? "null"})`),
          });
        }
      });
    } catch (error) {
      set({
        status: "idle",
        error: recordingFailedMessage((error as Error)?.message || "Failed to start recording"),
      });
      const current = get();
      current._cleanupSoxProcess();
      current._cleanupFile();
      throw error;
    } finally {
      set({ _transitionLock: false });
    }
  },

  stopAndTranscribe: async () => {
    const state = get();
    if (!state._soxProcess || state.status !== "recording") {
      return;
    }

    const proc = state._soxProcess;
    const filePath = state._currentFilePath;

    if (!filePath) {
      set({
        status: "idle",
        error: recordingFailedMessage("Missing recording file path"),
      });
      return;
    }

    try {
      await audioService.stop(proc);
      set({ _soxProcess: undefined });

      const size = await storageService.getFileSize(filePath).catch(() => 0);
      if (size <= WAV_HEADER_SIZE) {
        await storageService.deleteFile(filePath).catch(() => {});
        set({
          status: "idle",
          error: recordingFailedMessage("No audio was captured. The recording is empty."),
          filePath: undefined,
        });
        set({ _currentFilePath: undefined });
        return;
      }
    } catch (error) {
      set({
        status: "idle",
        error: recordingFailedMessage((error as Error)?.message || "Failed to stop recording"),
      });
      const current = get();
      current._cleanupSoxProcess();
      current._cleanupFile();
      return;
    }

    try {
      set({ status: "transcribing" });
      const text = await transcriptionService.transcribe(filePath);
      set({
        status: "transcribing_success",
        transcript: text || "",
        error: undefined,
      });
      set({ _currentFilePath: undefined });
    } catch (error) {
      set({
        status: "transcribing_error",
        error: (error as Error)?.message || "Transcription failed",
      });
    }
  },

  retryTranscription: async () => {
    const state = get();
    if (state.status !== "transcribing_error" || !state._currentFilePath) {
      return;
    }

    set({ status: "transcribing", error: undefined });

    try {
      const text = await transcriptionService.transcribe(state._currentFilePath);
      set({
        status: "transcribing_success",
        transcript: text || "",
        error: undefined,
      });
      set({ _currentFilePath: undefined });
    } catch (error) {
      set({
        status: "transcribing_error",
        error: (error as Error)?.message || "Transcription failed",
      });
    }
  },

  cancelRecording: async () => {
    const state = get();
    if (state._soxProcess) {
      try {
        await audioService.cancel(state._soxProcess);
      } catch {
        // ignore cancel errors
      }
    }

    const current = get();
    current._cleanupSoxProcess();
    current._cleanupFile();
    set({
      status: "idle",
      error: undefined,
      transcript: undefined,
    });
  },

  reset: () => {
    const state = get();
    if (state._soxProcess) {
      void get().cancelRecording();
    }
    set({
      status: "idle",
      transcript: undefined,
      error: undefined,
      filePath: undefined,
      _soxProcess: undefined,
      _currentFilePath: undefined,
    });
  },

  _cleanupSoxProcess: () => {
    const state = get();
    if (state._soxProcess) {
      try {
        state._soxProcess.kill("SIGKILL");
      } catch {
        // ignore kill failures
      }
      set({ _soxProcess: undefined });
    }
  },

  _cleanupFile: () => {
    const state = get();
    const filePath = state._currentFilePath;
    if (filePath) {
      storageService.deleteFile(filePath).catch(() => {});
      set({ _currentFilePath: undefined, filePath: undefined });
    }
  },
}));

export const useTranscriptionState = () =>
  useStoreWithEqualityFn(
    useTranscriptionStore,
    (state) => ({
      status: state.status,
      transcript: state.transcript,
      error: state.error,
      filePath: state.filePath,
    }),
    shallow,
  );

export const useTranscriptionActions = () =>
  useStoreWithEqualityFn(
    useTranscriptionStore,
    (state) => ({
      startRecording: state.startRecording,
      stopAndTranscribe: state.stopAndTranscribe,
      retryTranscription: state.retryTranscription,
      cancelRecording: state.cancelRecording,
      reset: state.reset,
    }),
    shallow,
  );

export type { TranscriptionStatus };
