/**
 * Format integers in Japanese unit notation (万, 億, 兆, 京, 垓, 秭).
 *
 * Examples (default, withInternalCommas=false):
 *   1234         → 1234           (untouched; < 10000)
 *   12345        → 1万2345
 *   1234567      → 123万4567
 *   12345678     → 1234万5678
 *   123456789    → 1億2345万6789
 *   10000        → 1万             (empty trailing groups dropped)
 *   100000000    → 1億             (all-zero middle and trailing groups dropped)
 *   100050001    → 1億5万1         (leading zeros stripped within non-leading groups)
 *
 * Same exclusions as `commafy`: decimals, already-formatted, hyphen-separated,
 * and Japanese year tokens are left untouched. The minus sign is preserved.
 *
 * Boundary policy:
 *   The transform pattern requires an ASCII-letter-free boundary on both sides
 *   (also rejecting connector-style IDs `INV-12345`, `SKU_12345`, version /
 *   scientific notation) to leave identifiers alone.
 */

export type JapaneseUnitsOptions = {
  /** Also place commas within each 4-digit unit group. Default: false. */
  withInternalCommas?: boolean;
  /** Skip Japanese year tokens (xxxx年). Default: true. */
  excludeYears?: boolean;
  /** Skip hyphen-separated digit groups. Default: true. */
  excludeHyphenated?: boolean;
};

export type JapaneseUnitsResult = {
  text: string;
  count: number;
};

// Standard Japanese myriad units. Each unit covers 4 decimal digits (10^4).
const UNITS = ["", "万", "億", "兆", "京", "垓", "秭"];

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

export function formatWithJapaneseUnits(text: string, opts: JapaneseUnitsOptions = {}): JapaneseUnitsResult {
  const withInternalCommas = opts.withInternalCommas ?? false;
  const excludeYears = opts.excludeYears ?? true;
  const excludeHyphenated = opts.excludeHyphenated ?? true;

  const excludeAlternatives: string[] = [
    String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?`,
    String.raw`\d+\.\d+`,
    // Scientific notation as a whole — prevents backtracking partial matches.
    String.raw`\d+(?:\.\d+)?[eE][+-]?\d+`,
  ];
  // Hyphen- AND slash-separated digit groups (phones, yyyy-mm-dd, yyyy/mm/dd).
  if (excludeHyphenated) excludeAlternatives.push(String.raw`\d+(?:[-/]\d+)+`);
  if (excludeYears) excludeAlternatives.push(String.raw`\d+年`);

  const lookbehinds = String.raw`(?<![A-Za-z][-_/]?\d*)(?<!\d[,_]\d*)`;
  const lookaheads = String.raw`(?!\d*[-_/]?[A-Za-z])(?!\d*[,_]\d)`;
  const fullPattern = new RegExp(
    `${excludeAlternatives.map((p) => `(?:${p})`).join("|")}|${lookbehinds}(-?)(\\d+)${lookaheads}`,
    "g",
  );

  let count = 0;
  const out = text.replace(fullPattern, (match, sign?: string, digits?: string) => {
    if (digits === undefined) return match;
    if (digits.length < 5) return (sign ?? "") + digits; // < 10000 stays as-is
    // Leave leading-zero tokens alone (ZIP codes, account IDs, "01234567").
    if (digits[0] === "0") return (sign ?? "") + digits;

    // Split into 4-digit groups from the right.
    // Using slice + push (preallocated index) instead of unshift to keep it linear.
    const groupCount = Math.ceil(digits.length / 4);
    const groups: string[] = new Array(groupCount);
    for (let g = 0; g < groupCount; g++) {
      const end = digits.length - g * 4;
      const start = Math.max(0, end - 4);
      groups[groupCount - 1 - g] = digits.slice(start, end);
    }

    // Collapse any excess groups beyond UNITS into the leading group.
    while (groups.length > UNITS.length) {
      const overflow = groups.shift()!;
      groups[0] = overflow + groups[0];
    }

    let result = "";
    for (let i = 0; i < groups.length; i++) {
      const unitIdx = groups.length - 1 - i;
      let g = groups[i];

      // Drop all-zero non-leading groups entirely (their unit marker too).
      if (i > 0 && /^0+$/.test(g)) continue;

      // Strip leading zeros within non-leading groups so 0001 → 1.
      if (i > 0) g = g.replace(/^0+/, "");

      if (withInternalCommas && g.length >= 4) {
        g = groupDigits(g, ",");
      }

      result += g;
      if (unitIdx > 0) result += UNITS[unitIdx];
    }

    count += 1;
    return (sign ?? "") + result;
  });

  return { text: out, count };
}
