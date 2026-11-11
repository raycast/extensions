import { randomInt } from "node:crypto";

export const AHV_PREFIX = "756";

const RANDOM_DIGITS = 9;

export function checkDigit(digits: string): number {
  const sum = [...digits].reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function ahvFromNumber(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value >= 10 ** RANDOM_DIGITS) {
    throw new Error(`${value} is not a number between 0 and 999999999`);
  }
  const digits = AHV_PREFIX + String(value).padStart(RANDOM_DIGITS, "0");
  return digits + checkDigit(digits);
}

export function randomAhv(): string {
  return ahvFromNumber(randomInt(10 ** RANDOM_DIGITS));
}

export function formatAhv(digits: string): string {
  return `${digits.slice(0, 3)}.${digits.slice(3, 7)}.${digits.slice(7, 11)}.${digits.slice(11)}`;
}

export function compactAhv(text: string): string {
  return text.replace(/\D/g, "");
}

export function isValidAhv(text: string): boolean {
  if (!/^756(\d{10}|\.\d{4}\.\d{4}\.\d{2})$/.test(text.trim())) return false;
  const digits = compactAhv(text);
  return checkDigit(digits.slice(0, 12)) === Number(digits[12]);
}
