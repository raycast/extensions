import { randomInt } from "node:crypto";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const HEX_LOWER = "0123456789abcdef";
const HEX_UPPER = "0123456789ABCDEF";

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

export function randomizePreservingShape(value: string): string {
  const prefix = findKnownPrefix(value);
  const body = value.slice(prefix.length);
  const randomizedBody = isHexString(body) ? randomizeHex(body) : randomizeByCharacterClass(body);
  return prefix + randomizedBody;
}

function findKnownPrefix(value: string): string {
  return KNOWN_PREFIXES.find((prefix) => value.startsWith(prefix)) ?? "";
}

function isHexString(value: string): boolean {
  const hexDigitsOnly = value.replace(/-/g, "");
  const isSingleCase = hexDigitsOnly === hexDigitsOnly.toLowerCase() || hexDigitsOnly === hexDigitsOnly.toUpperCase();
  return hexDigitsOnly.length >= MIN_HEX_LENGTH && isSingleCase && /^[0-9a-fA-F]+$/.test(hexDigitsOnly);
}

function randomizeHex(value: string): string {
  const alphabet = value === value.toUpperCase() ? HEX_UPPER : HEX_LOWER;
  return Array.from(value, (character) => (character === "-" ? character : pickRandom(alphabet))).join("");
}

function randomizeByCharacterClass(value: string): string {
  return Array.from(value, (character) => {
    const alphabet = findAlphabetFor(character);
    return alphabet ? pickRandom(alphabet) : character;
  }).join("");
}

function findAlphabetFor(character: string): string | undefined {
  if (UPPERCASE.includes(character)) return UPPERCASE;
  if (LOWERCASE.includes(character)) return LOWERCASE;
  if (DIGITS.includes(character)) return DIGITS;
  return undefined;
}

function pickRandom(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}
