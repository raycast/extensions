/**
 * AI prompt for video files
 */

import type { FileInfo, AIPromptConfig, FileMetadataContext } from "../../types";
import { BASE_INSTRUCTIONS, MAX_SUGGESTED_NAME_LENGTH } from "./base";

export function getVideoPrompt(file: FileInfo, metadata?: FileMetadataContext): AIPromptConfig {
  const contextParts: string[] = [];

  if (metadata?.spotlight?.duration) {
    const totalSeconds = Math.round(metadata.spotlight.duration);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    contextParts.push(`Duration: ${mins}:${secs.toString().padStart(2, "0")}`);
  }
  if (metadata?.spotlight?.pixelWidth && metadata?.spotlight?.pixelHeight) {
    contextParts.push(`Resolution: ${metadata.spotlight.pixelWidth}x${metadata.spotlight.pixelHeight}`);
  }
  if (metadata?.modified) {
    contextParts.push(`Modified: ${metadata.modified.toLocaleDateString()}`);
  }

  const context = contextParts.length > 0 ? `\n\nMetadata:\n${contextParts.join("\n")}` : "";

  return {
    fileType: "video",
    prompt: `${BASE_INSTRUCTIONS}

This is a video file.
Current name: ${file.baseName}
Extension: ${file.extension}${context}

Suggest a descriptive name based on the filename pattern and metadata. Consider:
- Video type (clip, recording, movie)
- Potential content (home video, screen recording, etc.)
- Date or event if apparent`,
    maxLength: MAX_SUGGESTED_NAME_LENGTH,
  };
}
