export const MAX_WORD_LENGTH = 32;
const WORD_INPUT_RE = /^[\p{L}]+(?:['-][\p{L}]+)?$/u;

export function normalizeWordInput(raw: string): string | null {
  const word = raw.trim();
  if (!word || word.length > MAX_WORD_LENGTH) return null;
  if (!WORD_INPUT_RE.test(word)) return null;
  return word;
}

export const MAX_TEXT_LENGTH = 2000;

export function normalizeTextInput(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > MAX_TEXT_LENGTH) return null;
  return text;
}

export function asJsonStringLiteral(value: string): string {
  return JSON.stringify(value);
}
