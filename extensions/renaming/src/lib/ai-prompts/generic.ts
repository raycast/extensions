/**
 * AI prompt for generic/unrecognized files
 */

import type { FileInfo, AIPromptConfig, FileMetadataContext } from "../../types";
import { BASE_INSTRUCTIONS, MAX_SUGGESTED_NAME_LENGTH } from "./base";

export function getGenericPrompt(file: FileInfo, metadata?: FileMetadataContext): AIPromptConfig {
  const contextParts: string[] = [];

  if (metadata?.size != null) {
    const sizeMB = (metadata.size / (1024 * 1024)).toFixed(1);
    contextParts.push(`Size: ${sizeMB} MB`);
  }
  if (metadata?.modified) {
    contextParts.push(`Modified: ${metadata.modified.toLocaleDateString()}`);
  }

  const context = contextParts.length > 0 ? `\n\nMetadata:\n${contextParts.join("\n")}` : "";

  return {
    fileType: "generic",
    prompt: `${BASE_INSTRUCTIONS}

This is a file.
Current name: ${file.baseName}
Extension: ${file.extension}${context}

Suggest a descriptive name based on the current filename and extension.`,
    maxLength: MAX_SUGGESTED_NAME_LENGTH,
  };
}
