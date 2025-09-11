import { environment } from "@raycast/api";

export const SUPPORTED_LANGUAGES = [
  { code: "auto", name: "Auto-detect" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ru", name: "Russian" },
];

export const TEMP_DIRECTORY = `${environment.supportPath}/temp`;
export const RECORDING_FORMAT = "wav";
export const RECORDING_SAMPLE_RATE = 16000;
export const RECORDING_CHANNELS = 1;
export const RECORDING_BITS = 16;

export const SOX_PATHS = [
  "/usr/local/bin/sox",
  "/opt/homebrew/bin/sox",
  "/usr/bin/sox",
  "sox",
];

export const MIN_AUDIO_SIZE_BYTES = 1024; // 1KB
export const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25MB (OpenAI limit)
