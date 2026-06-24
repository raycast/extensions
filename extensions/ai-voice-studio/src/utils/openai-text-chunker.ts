import { chunkTextByCharacterLimit } from "./shared-character-text-chunker";

const MAX_CHARS = 1800;

export function chunkText(text: string, maxChars: number = MAX_CHARS): string[] {
  return chunkTextByCharacterLimit(text, maxChars);
}
