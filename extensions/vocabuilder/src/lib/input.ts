export const MAX_VOCAB_LENGTH = 50;
export const MAX_PHRASE_TOKENS = 5;

const TOKEN = String.raw`[\p{L}]+(?:['-][\p{L}]+)*`;
const VOCAB_INPUT_RE = new RegExp(`^${TOKEN}(?:\\s+${TOKEN}){0,${MAX_PHRASE_TOKENS - 1}}$`, "u");

export function normalizeWordInput(raw: string): string | null {
  const collapsed = raw.trim().replace(/\s+/g, " ");
  if (!collapsed || collapsed.length > MAX_VOCAB_LENGTH) return null;
  if (!VOCAB_INPUT_RE.test(collapsed)) return null;
  return collapsed;
}

export const MAX_TEXT_LENGTH = 2000;

export function normalizeTextInput(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > MAX_TEXT_LENGTH) return null;
  return text;
}

/**
 * True for short, single-token inputs that look like a failed word/phrase attempt
 * (e.g. "fahj89sdf", "12345") rather than free-form text. Used to surface a
 * "word or phrase" validation error instead of sending junk to text translation.
 */
export const WORD_ATTEMPT_MAX_LENGTH = 20;
export function looksLikeWordAttempt(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > WORD_ATTEMPT_MAX_LENGTH) return false;
  return !/\s/.test(trimmed);
}

export function asJsonStringLiteral(value: string): string {
  return JSON.stringify(value);
}
