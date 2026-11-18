/**
 * Canonical input length limits for all user-facing text fields.
 * Keep in sync with:
 *   - shared/src/main/java/com/croutoncreations/nibit/shared/InputLimits.kt
 *   - web/src/lib/inputLimits.ts (canonical source — this file is a copy)
 *   - supabase/migrations/20260413000000_input_length_constraints.sql
 *   - nibit-proxy/src/constants.ts (PROMPT matches MAX_CONTEXT_FIELD)
 */
export const InputLimits = {
  NAME: 200,
  TRIGGER: 50,
  CONTENT: 50_000,
  QUICK_LINK_TARGET: 3_000,
  /** DB CHECK constraint value (octet_length). Client enforcement is via grapheme sanitization. */
  ICON_BYTES: 64,
  DESCRIPTION: 500,
  PROMPT: 10_000,
  PUSH_CONTENT: 50_000,
  PUSH_TITLE: 200,
  DEVICE_NAME: 100,
  /** 25 MB — matches nibit-blob-relay BLOB_MAX_BYTES in wrangler.toml */
  FILE_BYTES: 25 * 1024 * 1024,
} as const;

/**
 * Strips newline characters (\n, \r, Unicode line/paragraph separators) and trims.
 * Use on single-line fields (name, trigger, title, device name) before persisting.
 * Do NOT use on multi-line fields (content, prompt template).
 */
export function stripNewlines(value: string): string {
  return value.replace(/\r\n|[\n\r\u2028\u2029]/g, " ").trim();
}

/**
 * Replaces newline characters with spaces but does NOT trim.
 * Use in onChange handlers — trimming on every keystroke silently eats
 * the space between words (typing "John Smith" produces "JohnSmith").
 * Use stripNewlines() at save/persist time instead.
 */
export function replaceNewlines(value: string): string {
  return value.replace(/\r\n|[\n\r\u2028\u2029]/g, " ");
}

/**
 * Removes newline characters from a URL value (deletes, does not replace with space —
 * a space mid-URL is invalid). Use instead of stripNewlines for URL/target fields.
 *
 * Note: unlike stripNewlines, CRLF (\r\n) does not need special-casing here — deleting
 * each character individually still produces zero characters (correct for URL stripping).
 */
export function stripNewlinesFromUrl(value: string): string {
  return value.replace(/[\n\r\u2028\u2029]/g, "").trim();
}
