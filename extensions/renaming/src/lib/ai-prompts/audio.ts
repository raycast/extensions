/**
 * AI prompt for audio files
 */

import type { FileInfo, AIPromptConfig, FileMetadataContext } from "../../types";
import { BASE_INSTRUCTIONS, MAX_SUGGESTED_NAME_LENGTH } from "./base";

export function getAudioPrompt(file: FileInfo, metadata?: FileMetadataContext): AIPromptConfig {
  const contextParts: string[] = [];

  if (metadata?.spotlight?.artist) {
    contextParts.push(`Artist: ${metadata.spotlight.artist}`);
  }
  if (metadata?.spotlight?.album) {
    contextParts.push(`Album: ${metadata.spotlight.album}`);
  }
  if (metadata?.spotlight?.title) {
    contextParts.push(`Title: ${metadata.spotlight.title}`);
  }
  if (metadata?.spotlight?.duration) {
    const totalSeconds = Math.round(metadata.spotlight.duration);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    contextParts.push(`Duration: ${mins}:${secs.toString().padStart(2, "0")}`);
  }

  const context = contextParts.length > 0 ? `\n\nMetadata:\n${contextParts.join("\n")}` : "";

  return {
    fileType: "audio",
    prompt: `${BASE_INSTRUCTIONS}

This is an audio file.
Current name: ${file.baseName}
Extension: ${file.extension}${context}

Suggest a descriptive name. If music metadata is available, use format: artist_title
Otherwise, describe the likely content based on the filename.`,
    maxLength: MAX_SUGGESTED_NAME_LENGTH,
  };
}
