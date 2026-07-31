import { QWEN_TEXT_CHUNK_LIMIT } from "../constants/qwen-tts-voices";
import { chunkTextByCharacterLimit } from "./shared-character-text-chunker";

const MAX_CHARS = QWEN_TEXT_CHUNK_LIMIT;

export function chunkText(text: string, maxChars: number = MAX_CHARS): string[] {
  return chunkTextByCharacterLimit(text, maxChars);
}
