/**
 * Formats a byte count into a human-readable string (e.g. 1.4 MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Validates that a smart list search query contains only qualified terms.
 * Karakeep disallows bare full-text search terms in smart list queries.
 * Valid qualifiers: #tag, is:*, url:*, after:*, before:*, list:*, type:*
 * Logical operators (and, or, not) and parentheses are also allowed.
 */
export function isValidSmartQuery(query: string | undefined): boolean {
  if (!query || !query.trim()) return false;
  // Strip logical operators, parentheses, quotes, and whitespace, then check
  // that every remaining token is a qualifier, not a bare keyword.
  const stripped = query.replace(/\band\b|\bor\b|\bnot\b/gi, " ").replace(/[()"-]/g, " ");
  const tokens = stripped.split(/\s+/).filter(Boolean);
  const qualifierPattern = /^(-?(#\S+|is:\S+|url:\S+|after:\S+|before:\S+|list:\S+|type:\S+))$/i;
  return tokens.length > 0 && tokens.every((token) => qualifierPattern.test(token));
}

/**
 * Returns a useForm-compatible validator for the smart list query field.
 * Pass the `t` function from useTranslation to get localized error messages.
 */
export function makeSmartQueryValidator(t: (key: string, params?: Record<string, string>) => string) {
  return (value: string | undefined, allValues?: { type?: string }) => {
    if (allValues?.type !== "smart") return undefined;
    if (!value?.trim()) return t("common.fieldRequired", { field: t("list.listQuery") });
    if (!isValidSmartQuery(value)) return t("list.listQueryInvalid");
    return undefined;
  };
}

/**
 * Whether a string is exactly ONE emoji. Empty is valid — the caller
 * substitutes a default.
 *
 * Deliberately not `+`: a list icon is one glyph, and the field's own error
 * message says "Must be a single emoji", so accepting `😀😀` contradicted the
 * thing the UI had just told the user.
 *
 * Uses Unicode's own RGI_Emoji property rather than a hand-rolled codepoint
 * range. The previous regex stripped U+20E3 and then tested `1️⃣` as the plain
 * character `1`, so every keycap emoji was rejected — including three the
 * picker itself offers.
 *
 * The second test drops variation selectors: `⭐️` is U+2B50 U+FE0F, but U+2B50
 * already defaults to emoji presentation, so the RGI sequence is the bare
 * character and the decorated form fails the first test.
 */
const SINGLE_EMOJI = /^\p{RGI_Emoji}$/v;

export function isEmoji(str: string): boolean {
  const value = str.trim();
  if (!value) return true;
  return SINGLE_EMOJI.test(value) || SINGLE_EMOJI.test(value.replace(/\uFE0F/g, ""));
}
