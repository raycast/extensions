import type { KeshaSpawn } from "./kesha-bin";

export interface TranscribeResult {
  file: string;
  text: string;
}

export interface MicInfo {
  name: string;
  sampleRate?: number;
  channels?: number;
}

export type SignalState = "starting" | "unavailable" | "listening" | "signal";

export interface SignalLevel {
  rms: number;
  peak: number;
  percent: number;
  state: SignalState;
  status: string;
}

export type DictationState =
  | { status: "starting" }
  | {
      status: "recording";
      maxSeconds: number;
      elapsedSeconds: number;
      silentForMs: number;
      idle: boolean;
      mic: MicInfo;
      signal: SignalLevel;
    }
  | { status: "stopping" }
  | { status: "transcribing"; elapsedSeconds: number; timeoutSeconds: number }
  | { status: "error"; message: string; hint?: string }
  | { status: "ok"; result: TranscribeResult };

export type RecordingPatch = Partial<
  Extract<DictationState, { status: "recording" }>
>;

export interface RunningTask<T> {
  done: Promise<T>;
  stop: () => void;
}

export interface DictationPrefs {
  keshaBinPath?: string;
  maxRecordingSeconds?: string;
}

export interface DictationSession {
  stopRecording: () => void;
  cancelTranscription: () => void;
  cancel: () => void;
  done: Promise<void>;
}

export interface DictationControllerDeps {
  resolveKesha: (preference: string | undefined) => Promise<KeshaSpawn | null>;
  notFoundMessage: () => string;
  createTempDir: () => Promise<string>;
  cleanupTempDir: (tempDir: string) => Promise<void>;
  audioPathForTempDir: (tempDir: string) => string;
  audioBasename: (audioPath: string) => string;
  startRecordingMonitor: (
    onPatch: (patch: RecordingPatch) => void,
  ) => () => void;
  startRecorder: (
    kesha: KeshaSpawn,
    audioPath: string,
    maxSeconds: number,
  ) => RunningTask<void>;
  startTranscriber: (
    kesha: KeshaSpawn,
    audioPath: string,
  ) => RunningTask<string>;
  isSilentAudio: (audioPath: string) => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<void>;
  showToast: (toast: DictationToast) => Promise<void>;
  now?: () => number;
}

export interface DictationToast {
  style: "animated" | "success" | "failure";
  title: string;
  message?: string;
}
