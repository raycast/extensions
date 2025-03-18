import { environment } from "@raycast/api";
import path from "path";

export const DEFAULT_TEMP_DIR = path.join(environment.supportPath, "audio");

export const RECORDING_FILE_FORMAT = "wav";
export const RECORDING_SAMPLE_RATE = 16000; // 16kHz

export const TRANSCRIPTION_MODELS = [
  { id: "whisper-large-v3", name: "Whisper Large v3" },
  { id: "whisper-large-v3-turbo", name: "Whisper Large v3 Turbo" },
  { id: "distil-whisper-large-v3-en", name: "Distil Whisper" },
] as const;

// Available language options for transcription
export const LANGUAGE_OPTIONS = [
  { value: "auto", title: "Auto-detect" },
  { value: "en", title: "English" },
  { value: "es", title: "Spanish" },
  { value: "fr", title: "French" },
  { value: "de", title: "German" },
  { value: "it", title: "Italian" },
  { value: "pt", title: "Portuguese" },
  { value: "zh", title: "Chinese" },
  { value: "ja", title: "Japanese" },
  { value: "ko", title: "Korean" },
  { value: "ru", title: "Russian" },
] as const;

/**
 * Builds a complete prompt from the separate components
 * @param promptText Custom prompt instructions
 * @param userTerms Comma-separated list of specialized terms
 * @param highlightedText The text currently highlighted by the user (if any)
 * @returns Combined prompt string
 */
export function buildCompletePrompt(promptText?: string, userTerms?: string, highlightedText?: string): string {
  const parts: string[] = [];

  if (promptText && promptText.trim() !== "") {
    parts.push(promptText.trim());
  }

  if (userTerms && userTerms.trim() !== "") {
    const termsArray = userTerms
      .split(",")
      .map((term) => term.trim())
      .filter((term) => term !== "");
    if (termsArray.length > 0) {
      parts.push(
        `The following are specialized terms or names that should be recognized correctly: ${termsArray.join(", ")}.`,
      );
    }
  }

  if (highlightedText && highlightedText.trim() !== "") {
    parts.push(`Use the following text as context for the transcription:\n "${highlightedText.trim()}"`);
  }

  return parts.join(" ");
}

// Sox Configuration
export const SOX_CONFIG = {
  CHANNELS: 1, // Mono channel
  BIT_DEPTH: 16, // 16-bit depth
  ENCODING: "signed-integer", // Signed integer encoding
  VERBOSE_LEVEL: 1, // Verbose level for better error reporting
} as const;
