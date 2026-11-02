import { randomInt } from "node:crypto";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Random integer between min and max (both inclusive). */
export function int(min: number, max: number): number {
  return randomInt(min, max + 1);
}

/** Random string of decimal digits. */
export function digits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += randomInt(10);
  return out;
}

/** Random string of decimal digits that does not start with 0. */
export function nonZeroDigits(length: number): string {
  return String(int(1, 9)) + digits(length - 1);
}

/** Random string of uppercase letters. */
export function letters(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += UPPER[randomInt(26)];
  return out;
}

export function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}

/** Keep calling `fn` until it returns something other than undefined (for checksums that can be "invalid"). */
export function retry<T>(fn: () => T | undefined): T {
  for (let i = 0; i < 1000; i++) {
    const value = fn();
    if (value !== undefined) return value;
  }
  throw new Error("Could not generate a valid value");
}
