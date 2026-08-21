import { randomInt } from "node:crypto";

export const DEFAULT_PASSWORD_LENGTH = 12;
export const MIN_PASSWORD_LENGTH = 1;
export const MAX_PASSWORD_LENGTH = 256;

const LOWERCASE_CHARACTERS = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBER_CHARACTERS = "0123456789";
const SYMBOL_CHARACTERS = "!@#$%^&*()-_=+[]{};:,.?/";

export type PasswordOptions = {
  length: number;
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludedCharacters: string;
};

const DEFAULT_OPTIONS: PasswordOptions = {
  length: DEFAULT_PASSWORD_LENGTH,
  includeLowercase: true,
  includeUppercase: true,
  includeNumbers: true,
  includeSymbols: false,
  excludedCharacters: "",
};

function randomCharacter(characters: string) {
  return characters.charAt(randomInt(characters.length));
}

function shuffle(characters: string[]) {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const replacementIndex = randomInt(index + 1);
    [characters[index], characters[replacementIndex]] = [characters[replacementIndex], characters[index]];
  }

  return characters;
}

export function generatePassword(options: Partial<PasswordOptions> = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };

  if (
    !Number.isInteger(settings.length) ||
    settings.length < MIN_PASSWORD_LENGTH ||
    settings.length > MAX_PASSWORD_LENGTH
  ) {
    throw new Error(`Password length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}`);
  }

  const selectedGroups = [
    { enabled: settings.includeLowercase, name: "lowercase letters", characters: LOWERCASE_CHARACTERS },
    { enabled: settings.includeUppercase, name: "uppercase letters", characters: UPPERCASE_CHARACTERS },
    { enabled: settings.includeNumbers, name: "numbers", characters: NUMBER_CHARACTERS },
    { enabled: settings.includeSymbols, name: "symbols", characters: SYMBOL_CHARACTERS },
  ].filter((group) => group.enabled);

  if (selectedGroups.length === 0) {
    throw new Error("Select at least one character set");
  }

  const excludedCharacters = new Set(Array.from(settings.excludedCharacters));
  const availableGroups = selectedGroups.map((group) => ({
    ...group,
    characters: Array.from(group.characters)
      .filter((character) => !excludedCharacters.has(character))
      .join(""),
  }));
  const emptyGroup = availableGroups.find((group) => group.characters.length === 0);

  if (emptyGroup) {
    throw new Error(`Excluded characters remove all ${emptyGroup.name}`);
  }

  if (settings.length < availableGroups.length) {
    throw new Error(`Password length must be at least ${availableGroups.length} for the selected character sets`);
  }

  const allCharacters = availableGroups.map((group) => group.characters).join("");
  const password = availableGroups.map((group) => randomCharacter(group.characters));

  while (password.length < settings.length) {
    password.push(randomCharacter(allCharacters));
  }

  return shuffle(password).join("");
}
