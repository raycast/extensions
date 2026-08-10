export interface TranscriptionFile {
  id: string;
  filePath: string;
  fileName: string;
  recordedAt: Date;
  duration: number;
  sizeInBytes: number;
  wordCount: number;
  transcription: string | null;
}

export const enum ErrorTypes {
  RECORDING_FAILED = "Failed to start recording",
  AUDIO_TOO_SHORT = "Audio file is too short",
  AUDIO_NOT_FOUND = "Audio file not found",
  AUDIO_INVALID = "Invalid audio file",
  AUDIO_TOO_LARGE = "Audio file exceeds 25MB limit",
  SOX_NOT_INSTALLED = "Sox is not installed",
  TRANSCRIPTION_FAILED = "Transcription failed",
  API_KEY_MISSING = "OpenAI API key is required",
}

export interface AudioValidationResult {
  isValid: boolean;
  error?: ErrorTypes;
}

export type WhisperModel = "whisper-1" | "gpt-4o-transcribe";

export type ResponseFormat = "text" | "verbose_json" | "srt" | "vtt";

export type FormatMode = "email" | "slack" | "report" | "original";

export type TranscriptionState =
  | "idle"
  | "recording"
  | "transcribing"
  | "completed"
  | "formatting"
  | "error";

export interface Preferences {
  openaiApiKey: string;
  model: WhisperModel;
  language: string;
  prompt?: string;
  temperature?: number;
  customPromptEmail?: string;
  customPromptSlack?: string;
  customPromptReport?: string;
}

export interface TranscriptionMetadata {
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface DetailedTranscriptionResult {
  text: string;
  format: ResponseFormat;
  metadata?: TranscriptionMetadata;
}
