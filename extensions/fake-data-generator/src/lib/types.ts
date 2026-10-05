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
