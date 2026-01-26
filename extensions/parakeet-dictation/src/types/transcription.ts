export interface AlignedToken {
  text: string;
  start: number;
  end: number;
}

export interface AlignedSentence {
  text: string;
  start: number;
  end: number;
  tokens?: AlignedToken[];
}

export interface TranscriptionResult {
  text: string;
  sentences?: AlignedSentence[];
  duration?: number;
  wordCount: number;
}

export interface SetupStatus {
  parakeetInstalled: boolean;
  parakeetVersion: string | null;
  soxInstalled: boolean;
  ffmpegInstalled: boolean;
  pythonVersion: string | null;
  microphoneAccess: boolean;
  allReady: boolean;
}

export enum RecordingState {
  IDLE = "idle",
  RECORDING = "recording",
  PROCESSING = "processing",
  COMPLETE = "complete",
  ERROR = "error",
}
