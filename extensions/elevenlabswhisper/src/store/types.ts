import type { ChildProcessWithoutNullStreams } from "node:child_process";

export type TranscriptionStatus = "idle" | "recording" | "transcribing" | "transcribing_success" | "transcribing_error";

export interface TranscriptionState {
  status: TranscriptionStatus;
  transcript?: string;
  error?: string;
  filePath?: string;
  _soxProcess?: ChildProcessWithoutNullStreams;
  _currentFilePath?: string;
  _transitionLock: boolean;
}

export interface TranscriptionActions {
  startRecording: () => Promise<void>;
  stopAndTranscribe: () => Promise<void>;
  retryTranscription: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  reset: () => void;
  _cleanupSoxProcess: () => void;
  _cleanupFile: () => void;
}

export type TranscriptionStore = TranscriptionState & TranscriptionActions;
