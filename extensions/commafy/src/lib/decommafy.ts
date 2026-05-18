/**
 * Remove thousand-separator commas (or any configured separator) from
 * properly-formatted numbers in the input string.
 *
 * Only complete, boundary-clean grouped numbers are touched:
 *   "1,234"          → "1234"
 *   "1,234.56"       → "1234.56"
 *   "1234,567"       → "1234,567"  (not a valid grouped number; left as-is)
 *   "Order#1,234A"   → "Order#1,234A"  (alphanumeric boundary; left as-is)
 */

export type DecommafyOptions = {
  /** Separator character to strip. Default: ",". */
  separator?: string;
};

export type DecommafyResult = {
  text: string;
  count: number;
};

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function decommafy(text: string, opts: DecommafyOptions = {}): DecommafyResult {
  const separator = !opts.separator ? "," : opts.separator;
  const escapedSep = escapeRegex(separator);

  // Boundary: cannot be preceded or followed by another digit or ASCII letter.
  // This prevents partial matches like "234,567" inside "1234,567" and tokens
  // like "Order#1,234A" from being touched.
  const pattern = new RegExp(String.raw`(?<![A-Za-z0-9])\d{1,3}(?:${escapedSep}\d{3})+(?:\.\d+)?(?![A-Za-z0-9])`, "g");

  let count = 0;
  const out = text.replace(pattern, (match) => {
    count += 1;
    return match.split(separator).join("");
  });

  return { text: out, count };
}
