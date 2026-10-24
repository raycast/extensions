import crypto from "node:crypto";

import { lowercaseLetters, numbers, similarCharacters, symbols, uppercaseLetters } from "./character-sets.ts";

const passwordLengthError = "Password length must be a whole number from 4 to 64.";

type CharacterSet = {
  label: string;
  characters: string;
};

export type PasswordPreferenceValues = {
  passwordLength?: string;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeSimilarCharacters?: boolean;
  allowedSymbols?: string;
  excludedCharacters?: string;
};

export type PasswordOptions = {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilarCharacters: boolean;
  allowedSymbols: string;
  excludedCharacters: string;
};

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 12,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeSimilarCharacters: false,
  allowedSymbols: symbols,
  excludedCharacters: "",
};

export function resolvePasswordOptions(preferences: PasswordPreferenceValues = {}): PasswordOptions {
  return {
    length: resolvePasswordLength(preferences.passwordLength),
    includeUppercase: preferences.includeUppercase ?? DEFAULT_PASSWORD_OPTIONS.includeUppercase,
    includeLowercase: preferences.includeLowercase ?? DEFAULT_PASSWORD_OPTIONS.includeLowercase,
    includeNumbers: preferences.includeNumbers ?? DEFAULT_PASSWORD_OPTIONS.includeNumbers,
    includeSymbols: preferences.includeSymbols ?? DEFAULT_PASSWORD_OPTIONS.includeSymbols,
    excludeSimilarCharacters: preferences.excludeSimilarCharacters ?? DEFAULT_PASSWORD_OPTIONS.excludeSimilarCharacters,
    allowedSymbols: preferences.allowedSymbols?.trim() || DEFAULT_PASSWORD_OPTIONS.allowedSymbols,
    excludedCharacters: preferences.excludedCharacters ?? DEFAULT_PASSWORD_OPTIONS.excludedCharacters,
  };
}

export function generatePassword(options: PasswordOptions): string {
  const characterSets = getEnabledCharacterSets(options);

  if (characterSets.length === 0) {
    throw new Error("Choose at least one character type.");
  }

  if (options.length < characterSets.length) {
    throw new Error("Password length is too short for the selected character types.");
  }

  const characters = [...new Set(characterSets.flat())];
  const passwordCharacters = [
    ...characterSets.map((characterSet) => getRandomCharacter(characterSet)),
    ...Array.from({ length: options.length - characterSets.length }, () => getRandomCharacter(characters)),
  ];

  return shuffleCharacters(passwordCharacters).join("");
}

function resolvePasswordLength(lengthPreference: string | undefined): number {
  const lengthText = lengthPreference?.trim() || String(DEFAULT_PASSWORD_OPTIONS.length);
  const length = /^\d+$/.test(lengthText) ? Number.parseInt(lengthText, 10) : undefined;

  if (length === undefined || length < 4 || length > 64) {
    throw new Error(passwordLengthError);
  }

  return length;
}

function getEnabledCharacterSets(options: PasswordOptions): string[][] {
  const excludedCharacters = getExcludedCharacters(options);
  const characterSets: Array<CharacterSet | undefined> = [
    options.includeUppercase
      ? {
          label: "uppercase letters",
          characters: uppercaseLetters,
        }
      : undefined,
    options.includeLowercase
      ? {
          label: "lowercase letters",
          characters: lowercaseLetters,
        }
      : undefined,
    options.includeNumbers ? { label: "numbers", characters: numbers } : undefined,
    options.includeSymbols ? { label: "symbols", characters: options.allowedSymbols } : undefined,
  ];

  return characterSets
    .filter((characterSet): characterSet is CharacterSet => Boolean(characterSet))
    .map(({ label, characters }) => {
      const usableCharacters = excludeCharacters(characters, excludedCharacters);

      if (usableCharacters.length === 0) {
        throw new Error(`Selected settings leave no usable ${label}.`);
      }

      return usableCharacters;
    });
}

function getExcludedCharacters(options: PasswordOptions): Set<string> {
  return new Set([...options.excludedCharacters, ...(options.excludeSimilarCharacters ? similarCharacters : [])]);
}

function excludeCharacters(characterSet: string, excludedCharacters: Set<string>): string[] {
  return [...new Set(characterSet)].filter((character) => !excludedCharacters.has(character));
}

function getRandomCharacter(characters: string[]): string {
  return characters[crypto.randomInt(characters.length)];
}

function shuffleCharacters(characters: string[]): string[] {
  for (let index = characters.length - 1; index > 0; index--) {
    const swapIndex = crypto.randomInt(index + 1);

    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters;
}
