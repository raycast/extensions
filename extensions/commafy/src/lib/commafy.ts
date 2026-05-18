/**
 * Insert thousand-separator commas into integers (and optionally decimals)
 * found in the input string.
 *
 * Defaults:
 *   - Only numbers whose integer portion has `minDigits` or more digits are transformed.
 *   - The minus sign is preserved (e.g. "-1234" → "-1,234").
 *   - The following patterns are deliberately left untouched:
 *       * Decimal numbers              e.g. "1234.56"        (unless includeDecimals)
 *       * Already comma-formatted nums e.g. "1,234"
 *       * Already separator-formatted  e.g. "1_234" when separator="_"
 *       * Hyphen-separated digit runs  e.g. "090-1234-5678", "2026-05-18" (unless excludeHyphenated=false)
 *       * Year tokens (Japanese 年)    e.g. "2026年"          (unless excludeYears=false)
 *
 * Boundary policy:
 *   The transform pattern rejects tokens embedded in ASCII identifiers, including
 *   connector-style IDs like `INV-1234567`, `SKU_12345`, `ABC/12345`, and version /
 *   scientific notation like `v1234`, `1234e5`, `1.23e-10`. Kanji / kana / other
 *   non-ASCII chars do not block transformation (e.g. "売上1234567円" still works).
 *
 *   Partial grouped numbers are guarded: a digit run immediately preceded by
 *   `digit,` or followed by `,digit` (e.g. "1234,567" or "1234,5678") is left
 *   alone. The same guard is applied for the user-selected separator so that
 *   `1234_567` with separator "_" is also left untouched.
 *
 * Ambiguity guard:
 *   When `separator === "."` is combined with `includeDecimals === true`, the
 *   output (e.g. `1.234.56`) becomes ambiguous, so `includeDecimals` is silently
 *   coerced to `false` for that combination.
 */

export type CommafyOptions = {
  /** Minimum integer-part digit count to apply commas. Default: 4. */
  minDigits?: number;
  /** Separator character. Default: ",". */
  separator?: string;
  /** Also format the integer portion of decimal numbers. Default: false. */
  includeDecimals?: boolean;
  /** Skip Japanese year tokens (xxxx年). Default: true. */
  excludeYears?: boolean;
  /**
   * Skip hyphen- AND slash-separated digit groups (phone numbers, `yyyy-mm-dd`,
   * `yyyy/mm/dd`). Default: true.
   */
  excludeHyphenated?: boolean;
};

export type CommafyResult = {
  /** The transformed text. */
  text: string;
  /** Number of numeric tokens that were actually changed. */
  count: number;
};

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Group `digits` into 3-digit chunks from the right and join with `separator`.
 * Implemented as an O(n) split-and-join (NOT a `replace()` with a replacement
 * string), so user-provided separators containing `$`, `\`, etc. are safe.
 */
function groupDigits(digits: string, separator: string): string {
  if (digits.length <= 3) return digits;
  const n = digits.length;
  const head = n % 3 || 3;
  const chunks: string[] = [digits.slice(0, head)];
  for (let i = head; i < n; i += 3) {
    chunks.push(digits.slice(i, i + 3));
  }
  return chunks.join(separator);
}

export function commafy(text: string, opts: CommafyOptions = {}): CommafyResult {
  const minDigits = sanitizeMinDigits(opts.minDigits);
  const separator = sanitizeSeparator(opts.separator);
  const excludeYears = opts.excludeYears ?? true;
  const excludeHyphenated = opts.excludeHyphenated ?? true;
  // Period separator + includeDecimals would produce ambiguous output (e.g. "1.234.56").
  const includeDecimals = separator === "." ? false : (opts.includeDecimals ?? false);

  const escSep = escapeRegex(separator);

  // Patterns to LEAVE UNCHANGED. We always exclude comma-grouped numbers (they
  // are the canonical "already formatted" shape). If the user picked a non-comma
  // separator, we additionally exclude `\d{1,3}(sep\d{3})+` so that re-running
  // the command is idempotent in the user's chosen style.
  const excludeAlternatives: string[] = [String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?`];
  if (separator !== "," && separator !== ".") {
    excludeAlternatives.push(`\\d{1,3}(?:${escSep}\\d{3})+(?:\\.\\d+)?`);
  }
  // Scientific notation as a whole — exclude before transform so `\d+` greedy
  // matching can't backtrack and produce partial matches like "1234" inside "12345e6".
  excludeAlternatives.push(String.raw`\d+(?:\.\d+)?[eE][+-]?\d+`);
  // Hyphen- AND slash-separated digit groups: phone numbers, `yyyy-mm-dd`, `yyyy/mm/dd`.
  if (excludeHyphenated) excludeAlternatives.push(String.raw`\d+(?:[-/]\d+)+`);
  if (excludeYears) excludeAlternatives.push(String.raw`\d+年`);
  if (!includeDecimals) excludeAlternatives.push(String.raw`\d+\.\d+`);

  // Boundary guards for the transform pattern.
  //   (?<![A-Za-z][-_/]?\d*)  — not preceded by identifier prefix (subsumes plain
  //                             letter, "SKU1234", "INV-1234567", "SKU_12345").
  //   (?<!\d[,_]\d*)          — not preceded by `digit` + `,` or `_` + any digits.
  //                             The trailing `\d*` makes the guard backtrack-safe:
  //                             even if `\d+` is shortened, the leading context still
  //                             contains the forbidden separator. Catches both
  //                             `1234,567` and `1234_5678` (Python-style literal).
  //   (?<!\d<sep>\d*)         — same with the user's separator (when not `,` / `_`).
  //   (?!\d*[-_/]?[A-Za-z])   — not followed by digits + optional `[-_/]` + ASCII letter
  //                             (catches "1234A", "1234e5", "1234-ABC", "1234_XYZ").
  //   (?!\d*[,_]\d)           — not followed by any digits + `,` or `_` + digit.
  //                             The leading `\d*` makes the guard backtrack-safe:
  //                             `\d+` cannot be shortened to dodge it.
  //   (?!\d*<sep>\d)          — same with the user's separator (when not `,` / `_`).
  let lookbehinds = String.raw`(?<![A-Za-z][-_/]?\d*)(?<!\d[,_]\d*)`;
  let lookaheads = String.raw`(?!\d*[-_/]?[A-Za-z])(?!\d*[,_]\d)`;
  if (separator !== "," && separator !== "_") {
    lookbehinds += `(?<!\\d${escSep}\\d*)`;
    lookaheads += `(?!\\d*${escSep}\\d)`;
  }

  const transformBody = includeDecimals ? String.raw`(-?)(\d+(?:\.\d+)?)` : String.raw`(-?)(\d+)`;
  const transformPattern = `${lookbehinds}${transformBody}${lookaheads}`;

  const fullPattern = new RegExp(`${excludeAlternatives.map((p) => `(?:${p})`).join("|")}|${transformPattern}`, "g");

  let count = 0;
  const out = text.replace(fullPattern, (match, sign?: string, digits?: string) => {
    if (digits === undefined) return match;

    const signPart = sign ?? "";
    const dotIdx = digits.indexOf(".");
    const intPart = dotIdx >= 0 ? digits.slice(0, dotIdx) : digits;
    const decPart = dotIdx >= 0 ? digits.slice(dotIdx) : "";

    if (intPart.length < minDigits) return signPart + digits;
    // Leave leading-zero tokens alone (ZIP codes, account IDs, "01234").
    if (intPart.length > 1 && intPart[0] === "0") return signPart + digits;

    const grouped = groupDigits(intPart, separator);
    if (grouped === intPart) return signPart + digits;

    count += 1;
    return signPart + grouped + decPart;
  });

  return { text: out, count };
}

function sanitizeMinDigits(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw) || raw < 1) return 4;
  return Math.floor(raw);
}

/**
 * Fall back to "," for empty / undefined / control-character separators.
 * The library accepts any non-empty single-or-multi-character separator
 * (e.g. ", ", "_"); the Raycast command UI constrains the choice further.
 */
function sanitizeSeparator(raw: string | undefined): string {
  if (raw === undefined || raw === "") return ",";
  return raw;
}
