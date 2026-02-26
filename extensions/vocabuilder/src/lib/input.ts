export const MAX_WORD_LENGTH = 32;
const WORD_INPUT_RE = /^[A-Za-z]+(?:['-][A-Za-z]+)?$/;

export function normalizeWordInput(raw: string): string | null {
  const word = raw.trim();
  if (!word || word.length > MAX_WORD_LENGTH) return null;
  if (!WORD_INPUT_RE.test(word)) return null;
  return word;
}

export function asJsonStringLiteral(value: string): string {
  return JSON.stringify(value);
}
