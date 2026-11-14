import { randomInt } from "node:crypto";

const DIGITS = "0123456789";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALNUM = DIGITS + UPPER;

export type Charset = "digit" | "upper" | "alnum";

export function randomString(length: number, charset: Charset): string {
  const pool = charset === "digit" ? DIGITS : charset === "upper" ? UPPER : ALNUM;
  let out = "";
  for (let i = 0; i < length; i++) {
    out += pool.charAt(randomInt(pool.length));
  }
  return out;
}

export function randomDigits(length: number): string {
  return randomString(length, "digit");
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[randomInt(items.length)]!;
}
