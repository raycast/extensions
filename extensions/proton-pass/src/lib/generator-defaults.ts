import { PasswordType } from "./types";

export const MIN_RANDOM_LENGTH = 8;
export const MAX_RANDOM_LENGTH = 128;
export const MIN_PASSPHRASE_WORDS = 3;
export const MAX_PASSPHRASE_WORDS = 10;
const DEFAULT_RANDOM_LENGTH = 20;
const DEFAULT_PASSPHRASE_WORDS = 4;

export const PASSPHRASE_SEPARATORS = [
  "hyphens",
  "spaces",
  "periods",
  "commas",
  "underscores",
  "numbers",
  "numbers-and-symbols",
] as const;

export type PassphraseSeparator = (typeof PASSPHRASE_SEPARATORS)[number];

export interface GeneratorSettings {
  type: PasswordType;
  length: number;
  words: number;
  includeNumbers: boolean;
  includeUppercase: boolean;
  includeSymbols: boolean;
  separator: PassphraseSeparator;
  capitalize: boolean;
}

/** The Generate Password command's preferences; every one is optional so older settings still load. */
export interface GeneratorPreferences {
  defaultPasswordType?: string;
  defaultPasswordLength?: string;
  defaultPassphraseWords?: string;
  passphraseSeparator?: string;
  includeUppercase?: boolean;
  includeSymbols?: boolean;
  includeNumbers?: boolean;
  capitalizeWords?: boolean;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

function isPassphraseSeparator(value: string | undefined): value is PassphraseSeparator {
  return PASSPHRASE_SEPARATORS.some((separator) => separator === value);
}

/** Settings the generator starts with, from the command's preferences. */
export function getInitialSettings(preferences: GeneratorPreferences): GeneratorSettings {
  return {
    type: preferences.defaultPasswordType === "passphrase" ? "passphrase" : "random",
    length: parseNumber(preferences.defaultPasswordLength, DEFAULT_RANDOM_LENGTH, MIN_RANDOM_LENGTH, MAX_RANDOM_LENGTH),
    words: parseNumber(
      preferences.defaultPassphraseWords,
      DEFAULT_PASSPHRASE_WORDS,
      MIN_PASSPHRASE_WORDS,
      MAX_PASSPHRASE_WORDS,
    ),
    includeNumbers: preferences.includeNumbers ?? true,
    includeUppercase: preferences.includeUppercase ?? true,
    includeSymbols: preferences.includeSymbols ?? true,
    separator: isPassphraseSeparator(preferences.passphraseSeparator) ? preferences.passphraseSeparator : "hyphens",
    capitalize: preferences.capitalizeWords ?? true,
  };
}
