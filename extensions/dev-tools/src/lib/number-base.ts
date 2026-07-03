// Integer base conversion built on BigInt, so arbitrarily large values convert
// exactly (Number would lose precision past 2^53). Values are signed integers.

export type Base = "binary" | "octal" | "decimal" | "hexadecimal";

/** Bases in the order they are presented to the user. */
export const BASES: Base[] = ["decimal", "hexadecimal", "octal", "binary"];

const RADIX: Record<Base, number> = { binary: 2, octal: 8, decimal: 10, hexadecimal: 16 };

/** Conventional source-code prefix for each base (decimal has none). */
export const PREFIX: Record<Base, string> = { binary: "0b", octal: "0o", decimal: "", hexadecimal: "0x" };

export const LABEL: Record<Base, string> = {
  binary: "Binary",
  octal: "Octal",
  decimal: "Decimal",
  hexadecimal: "Hexadecimal",
};

function detectPrefix(unsigned: string): Base | null {
  const lower = unsigned.toLowerCase();
  if (lower.startsWith("0x")) return "hexadecimal";
  if (lower.startsWith("0b")) return "binary";
  if (lower.startsWith("0o")) return "octal";
  return null;
}

/**
 * Pick a base for `auto` input: an explicit `0x`/`0b`/`0o` prefix wins; otherwise
 * the presence of an a–f digit implies hexadecimal (so bare `ff` is hex), falling
 * back to decimal for plain digit strings. (Binary/octal still need a prefix,
 * since bare `101` is inherently ambiguous.)
 */
function detectBase(unsigned: string): Base {
  return detectPrefix(unsigned) ?? (/[a-f]/i.test(unsigned) ? "hexadecimal" : "decimal");
}

function stripPrefix(unsigned: string, base: Base): string {
  const prefix = PREFIX[base];
  return prefix && unsigned.toLowerCase().startsWith(prefix) ? unsigned.slice(prefix.length) : unsigned;
}

/**
 * Parse `input` as an integer. With `base = "auto"` the base is taken from a
 * `0x`/`0b`/`0o` prefix, falling back to decimal. Underscores and whitespace are
 * ignored as digit separators. Throws on any digit invalid for the resolved base.
 */
export function parse(input: string, base: Base | "auto"): bigint {
  let rest = input.trim().replace(/[_\s]/g, "");
  if (!rest) throw new Error("Enter a number.");

  let negative = false;
  if (rest[0] === "+") rest = rest.slice(1);
  else if (rest[0] === "-") {
    negative = true;
    rest = rest.slice(1);
  }
  if (!rest) throw new Error("Enter a number.");

  const resolved: Base = base === "auto" ? detectBase(rest) : base;
  rest = stripPrefix(rest, resolved);
  if (!rest) throw new Error("Enter a number.");

  const radix = RADIX[resolved];
  const bigRadix = BigInt(radix);
  let value = 0n;
  for (const ch of rest) {
    const digit = parseInt(ch, radix);
    if (Number.isNaN(digit) || digit >= radix) {
      throw new Error(`"${ch}" is not a valid ${LABEL[resolved].toLowerCase()} digit.`);
    }
    value = value * bigRadix + BigInt(digit);
  }
  return negative ? -value : value;
}

/** Render `value` in `base` without a prefix (e.g. `255` → `ff` in hex). */
export function format(value: bigint, base: Base): string {
  return value.toString(RADIX[base]);
}

/** Render `value` in `base` with its conventional prefix (e.g. `-255` → `-0xff`). */
export function withPrefix(value: bigint, base: Base): string {
  const digits = value.toString(RADIX[base]);
  if (!PREFIX[base]) return digits;
  return digits.startsWith("-") ? `-${PREFIX[base]}${digits.slice(1)}` : `${PREFIX[base]}${digits}`;
}

export type UnicodeInfo = { char: string; codePoint: string; isControl: boolean };

/**
 * Interpret `value` as a Unicode code point, or `null` if it isn't a valid one
 * (negative, above U+10FFFF, or an unpaired surrogate).
 */
export function toUnicode(value: bigint): UnicodeInfo | null {
  if (value < 0n || value > 0x10ffffn) return null;
  const n = Number(value);
  if (n >= 0xd800 && n <= 0xdfff) return null;
  return {
    char: String.fromCodePoint(n),
    codePoint: `U+${n.toString(16).toUpperCase().padStart(4, "0")}`,
    isControl: n < 0x20 || (n >= 0x7f && n <= 0x9f),
  };
}
