import crypto from "crypto";
import { PasswordForm } from "./PasswordForm";

const CHARSETS = {
  lowercase: "abcdefghijkmnopqrstuvwxyz",
  uppercase: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  numbers: "123456789",
  symbols: "~․!@#$%^&*()_-+=[][]|\\;:'\"<>,.?/",
} as const;

export function generatePassword(
  len: number,
  useNumbers: boolean,
  useUpper: boolean,
  useChars: boolean,
  customChars: string,
): string {
  if (len < 8) {
    throw new Error("Password length must be at least 8 characters");
  }

  let characterPool = CHARSETS.lowercase;
  let requiredChars = "";

  if (useUpper) {
    characterPool += CHARSETS.uppercase;
    requiredChars += getRandomChar(CHARSETS.uppercase);
  }

  if (useNumbers) {
    characterPool += CHARSETS.numbers;
    requiredChars += getRandomChar(CHARSETS.numbers);
  }

  if (useChars) {
    const specialChars = customChars?.trim() || CHARSETS.symbols;
    if (specialChars.length === 0) {
      throw new Error("Custom characters cannot be empty when special characters are enabled");
    }
    characterPool += specialChars;
    requiredChars += getRandomChar(specialChars);
  }

  const remainingLength = len - requiredChars.length;
  let remainingPassword = "";
  for (let i = 0; i < remainingLength; i++) {
    remainingPassword += getRandomChar(characterPool);
  }

  return shuffleString(requiredChars + remainingPassword);
}

function getRandomChar(charset: string): string {
  return charset.charAt(crypto.randomInt(0, charset.length));
}

function shuffleString(str: string): string {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export function calculateEntropy(password: string, charsetSize: number): number {
  return password.length * Math.log2(charsetSize);
}

export function calculateCharsetSize(values: PasswordForm): number {
  let charset = "abcdefghijkmnopqrstuvwxyz";
  if (values.useUpper) charset += "ABCDEFGHJKLMNPQRSTUVWXYZ";
  if (values.useNumbers) charset += "123456789";
  if (values.useChars) charset += values.customChars?.trim() || "~․!@#$%^&*()_-+=[][]|\\;:'\"<>,.?/";
  return new Set(charset).size;
}
