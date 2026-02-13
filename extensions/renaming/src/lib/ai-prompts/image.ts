/**
 * AI prompt for image files
 */

import type { FileInfo, AIPromptConfig, FileMetadataContext } from "../../types";
import { BASE_INSTRUCTIONS, MAX_SUGGESTED_NAME_LENGTH } from "./base";

export function getImagePrompt(file: FileInfo, metadata?: FileMetadataContext): AIPromptConfig {
  const contextParts: string[] = [];

  if (metadata?.exif?.dateTaken) {
    contextParts.push(`Taken: ${metadata.exif.dateTaken.toLocaleDateString()}`);
  }
  if (metadata?.exif?.camera) {
    contextParts.push(`Camera: ${metadata.exif.camera}`);
  }
  if (metadata?.exif?.width && metadata?.exif?.height) {
    contextParts.push(`Size: ${metadata.exif.width}x${metadata.exif.height}`);
  }

  const context = contextParts.length > 0 ? `\n\nMetadata:\n${contextParts.join("\n")}` : "";

  return {
    fileType: "image",
    prompt: `${BASE_INSTRUCTIONS}

This is an image file.
Current name: ${file.baseName}
Extension: ${file.extension}${context}

Suggest a descriptive name that captures what the image likely contains based on its name and metadata. Consider:
- Location names if apparent
- Event or occasion type
- Subject matter
- Time period (if date available)`,
    maxLength: MAX_SUGGESTED_NAME_LENGTH,
  };
}
