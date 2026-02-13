/**
 * AI prompt for document files
 */

import type { FileInfo, AIPromptConfig, FileMetadataContext } from "../../types";
import { BASE_INSTRUCTIONS, MAX_SUGGESTED_NAME_LENGTH } from "./base";

export function getDocumentPrompt(file: FileInfo, metadata?: FileMetadataContext): AIPromptConfig {
  const contextParts: string[] = [];

  if (metadata?.spotlight?.pageCount) {
    contextParts.push(`Pages: ${metadata.spotlight.pageCount}`);
  }
  if (metadata?.modified) {
    contextParts.push(`Modified: ${metadata.modified.toLocaleDateString()}`);
  }

  const context = contextParts.length > 0 ? `\n\nMetadata:\n${contextParts.join("\n")}` : "";

  return {
    fileType: "document",
    prompt: `${BASE_INSTRUCTIONS}

This is a document file.
Current name: ${file.baseName}
Extension: ${file.extension}${context}

Suggest a descriptive name based on the current filename. Consider:
- Document type (report, letter, invoice, notes, etc.)
- Topic or subject
- Date or version if apparent
- Keep it professional and organized`,
    maxLength: MAX_SUGGESTED_NAME_LENGTH,
  };
}
