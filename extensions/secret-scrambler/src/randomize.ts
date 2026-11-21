import { randomInt } from "node:crypto";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const CYRILLIC_UPPERCASE = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const CYRILLIC_LOWERCASE = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const HEX_LETTERS_UPPERCASE = "ABCDEF";
const HEX_LETTERS_LOWERCASE = "abcdef";

// Shorter hex-looking strings are more likely to be ordinary words (e.g. "cafe", "added")
const MIN_HEX_LENGTH = 16;

// Prefixes that identify the token type; kept intact so the agent still understands the format.
// Longer prefixes go first so that "sk-ant-" wins over "sk-".
const KNOWN_PREFIXES: readonly string[] = [
  "sk-ant-",
  "sk-proj-",
  "sk-",
  "github_pat_",
  "ghp_",
  "gho_",
  "ghs_",
  "glpat-",
  "xoxb-",
  "xoxp-",
  "AKIA",
  "eyJ",
];

type CharacterClass = {
  pattern: RegExp;
  alphabet: string;
};

// Ordered from specific to generic: the first matching class wins
const TEXT_CHARACTER_CLASSES: readonly CharacterClass[] = [
  { pattern: /[A-Z]/, alphabet: UPPERCASE },
  { pattern: /[a-z]/, alphabet: LOWERCASE },
  { pattern: /[0-9]/, alphabet: DIGITS },
  { pattern: /[А-ЯЁ]/, alphabet: CYRILLIC_UPPERCASE },
  { pattern: /[а-яё]/, alphabet: CYRILLIC_LOWERCASE },
  // Letters and digits of any other script are replaced with ASCII so that no part of the secret leaks
  { pattern: /\p{Lu}/u, alphabet: UPPERCASE },
  { pattern: /\p{L}/u, alphabet: LOWERCASE },
  { pattern: /\p{N}/u, alphabet: DIGITS },
];

// Letters stay letters and digits stay digits, so the string keeps both its shape and hex validity
const HEX_CHARACTER_CLASSES: readonly CharacterClass[] = [
  { pattern: /[A-F]/, alphabet: HEX_LETTERS_UPPERCASE },
  { pattern: /[a-f]/, alphabet: HEX_LETTERS_LOWERCASE },
  { pattern: /[0-9]/, alphabet: DIGITS },
];

export function containsReplaceableCharacters(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

export function randomizePreservingShape(value: string): string {
  const prefix = findKnownPrefix(value);
  const body = value.slice(prefix.length);
  const characterClasses = isHexString(body) ? HEX_CHARACTER_CLASSES : TEXT_CHARACTER_CLASSES;
  return prefix + replaceCharacters(body, characterClasses);
}

function findKnownPrefix(value: string): string {
  return KNOWN_PREFIXES.find((prefix) => value.startsWith(prefix)) ?? "";
}

function isHexString(value: string): boolean {
  const hexDigitsOnly = value.replace(/-/g, "");
  return hexDigitsOnly.length >= MIN_HEX_LENGTH && /^[0-9a-fA-F]+$/.test(hexDigitsOnly);
}

function replaceCharacters(value: string, characterClasses: readonly CharacterClass[]): string {
  return Array.from(value, (character) => {
    const alphabet = findAlphabetFor(character, characterClasses);
    return alphabet ? pickRandom(alphabet) : character;
  }).join("");
}

function findAlphabetFor(character: string, characterClasses: readonly CharacterClass[]): string | undefined {
  return characterClasses.find(({ pattern }) => pattern.test(character))?.alphabet;
}

function pickRandom(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}
