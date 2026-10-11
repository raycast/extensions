export interface Field {
  label: string;
  value: string;
}

/** A generated value with a machine-friendly and a human-friendly representation. */
export interface Generated {
  /** No spaces or separators, e.g. "BE71096123456769". */
  compact: string;
  /** Human formatting, e.g. "BE71 0961 2345 6769". */
  formatted: string;
  /** Extra copyable variants (e.g. "Without country prefix"). */
  variants?: Field[];
  /** Breakdown shown in the detail panel. */
  fields?: Field[];
}

/** ISO 3166-1 alpha-2 code to flag emoji. */
export function flag(countryCode: string): string {
  return [...countryCode.toUpperCase()].map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join("");
}

/** Groups a string into blocks: groups("123456789", [3, 3, 3], " ") -> "123 456 789". */
export function groups(value: string, sizes: number[], separator = " "): string {
  const out: string[] = [];
  let index = 0;
  for (const size of sizes) {
    if (index >= value.length) break;
    out.push(value.slice(index, index + size));
    index += size;
  }
  if (index < value.length) out.push(value.slice(index));
  return out.join(separator);
}

const MINOR_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "so",
  "yet",
  "as",
  "at",
  "by",
  "from",
  "in",
  "into",
  "of",
  "off",
  "on",
  "onto",
  "per",
  "to",
  "up",
  "via",
  "with",
]);

/**
 * Apple-style Title Case for action titles: "Copy date of birth (local)" -> "Copy Date of Birth (Local)".
 * Tokens that aren't plain words (first.last, MM/YY, +) are left untouched.
 */
export function titleCase(value: string): string {
  const words = value.split(" ");
  return words
    .map((word, i) => {
      const m = word.match(/^([([]?)(\p{Ll})(\p{L}*)([)\]]?)$/u);
      if (!m) return word;
      const [, open, first, rest, close] = m;
      const isEdge = i === 0 || i === words.length - 1;
      if (!isEdge && !open && MINOR_WORDS.has(first + rest)) return word;
      return open + first.toUpperCase() + rest + close;
    })
    .join(" ");
}
