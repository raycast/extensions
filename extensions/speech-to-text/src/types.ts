import { TRANSCRIPTION_MODELS } from "./constants";

export type TranscriptionModelId = (typeof TRANSCRIPTION_MODELS)[number]["id"];

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

export interface TranscriptionResult {
  text: string;
  timestamp: string;
  audioFile?: string;
  language?: string;
  prompt?: string;
  model?: TranscriptionModelId;
}

export enum ErrorTypes {
  SOX_NOT_INSTALLED = "Sox is not installed. Please install it using 'brew install sox' and restart Raycast.",
  ALREADY_RECORDING = "Recording is already in progress",
  EMPTY_RECORDING = "The recording file is empty",
  NO_RECORDING_FILE = "No recording file was created",
  RECORDING_PROCESS_ERROR = "Recording process error",
  RECORDING_START_ERROR = "Failed to start recording",
  RECORDING_STOP_ERROR = "Failed to stop recording",
  INVALID_RECORDING = "Invalid recording file",
  AUDIO_FILE_MISSING = "Audio file does not exist",
  AUDIO_FILE_EMPTY = "Audio file is empty",
  AUDIO_FILE_TOO_SMALL = "Audio file is too small to be valid",
  AUDIO_FILE_INVALID_FORMAT = "Audio file format is invalid",
  AUDIO_FILE_VALIDATION_ERROR = "Failed to validate audio file",
}

export interface AudioValidationResult {
  isValid: boolean;
  error?: ErrorTypes;
}
