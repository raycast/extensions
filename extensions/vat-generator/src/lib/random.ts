/**
 * Low-level randomness helpers used by the VAT generators.
 * These produce test/throwaway data only.
 */

const DIGITS = "0123456789";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALNUM = DIGITS + LETTERS;

export function randInt(minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
}

export function pick<T>(items: readonly T[]): T {
  return items[randInt(0, items.length - 1)];
}

export function randomDigit(): string {
  return pick(DIGITS.split(""));
}

export function randomDigitNonZero(): string {
  return String(randInt(1, 9));
}

export function randomLetter(): string {
  return pick(LETTERS.split(""));
}

export function randomAlnum(): string {
  return pick(ALNUM.split(""));
}

/** Build a string of `count` random digits. */
export function randomDigits(count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) out += randomDigit();
  return out;
}

/** Turn a numeric string into an array of single-digit numbers. */
export function toDigitArray(value: string): number[] {
  return value.split("").map((c) => Number(c));
}

/** Left-pad a number with zeros to the desired width. */
export function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}
