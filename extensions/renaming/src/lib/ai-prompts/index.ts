/**
 * AI Prompt Templates for Smart Renaming
 *
 * Generates context-appropriate prompts for AI-powered file naming suggestions.
 * Each file type has its own prompt module.
 */

import type { FileInfo, AIPromptConfig, FileMetadataContext } from "../../types";
import { getFileCategory } from "../file-types";
import { MAX_SUGGESTED_NAME_LENGTH } from "./base";
import { getImagePrompt } from "./image";
import { getVideoPrompt } from "./video";
import { getAudioPrompt } from "./audio";
import { getDocumentPrompt } from "./document";
import { getCodePrompt } from "./code";
import { getGenericPrompt } from "./generic";

export { MAX_SUGGESTED_NAME_LENGTH } from "./base";

/**
 * Get an AI prompt configuration for a file
 */
export function getAIPromptForFile(file: FileInfo, metadata?: FileMetadataContext): AIPromptConfig {
  const category = getFileCategory(file.extension);

  switch (category) {
    case "image":
      return getImagePrompt(file, metadata);
    case "video":
      return getVideoPrompt(file, metadata);
    case "audio":
      return getAudioPrompt(file, metadata);
    case "document":
      return getDocumentPrompt(file, metadata);
    case "code":
      return getCodePrompt(file);
    default:
      return getGenericPrompt(file, metadata);
  }
}

/**
 * Create a batch prompt for multiple files
 */
export function getBatchAIPrompt(files: Array<{ file: FileInfo; metadata?: FileMetadataContext }>): string {
  const fileList = files.map((f, i) => `${i + 1}. ${f.file.name}`).join("\n");

  return `Generate descriptive filenames for these files. Rules:
- Use lowercase with underscores (snake_case)
- Be concise (max ${MAX_SUGGESTED_NAME_LENGTH} chars each)
- No file extensions
- No special characters except underscores
- Return one filename per line, numbered to match

Files:
${fileList}

Respond with numbered filenames only:`;
}

/**
 * Parse batch AI response into individual names
 */
export function parseBatchAIResponse(response: string, expectedCount: number): string[] {
  const lines = response
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const names: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\d+[.)]\s*(.+)$/);
    if (match) {
      names.push(cleanSuggestedName(match[1]!));
    } else if (!line.match(/^\d+[.)]/)) {
      names.push(cleanSuggestedName(line));
    }

    if (names.length >= expectedCount) break;
  }

  while (names.length < expectedCount) {
    names.push("unnamed");
  }

  return names;
}

/**
 * Clean up an AI-suggested name
 */
export function cleanSuggestedName(name: string): string {
  let cleaned = name
    .toLowerCase()
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (cleaned.length > MAX_SUGGESTED_NAME_LENGTH) {
    cleaned = cleaned.substring(0, MAX_SUGGESTED_NAME_LENGTH);
    cleaned = cleaned.replace(/_$/, "");
  }

  return cleaned || "unnamed";
}
