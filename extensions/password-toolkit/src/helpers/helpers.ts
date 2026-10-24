import crypto from "node:crypto";

import { numbers, randomCharacters, symbols } from "./character-sets.ts";
import { passphraseFormatUsesWords, validatePassphraseFormat } from "./passphrase-format.ts";

export {
  CUSTOM_FORMAT_FIELD_PRESET,
  CUSTOM_WORD_SEPARATOR_PRESET,
  DEFAULT_PASSPHRASE_FORMAT,
  DEFAULT_PASSPHRASE_OPTIONS,
  SETTINGS_FORMAT_PRESET,
  SETTINGS_WORD_SEPARATOR_PRESET,
  buildPassphraseFormat,
  passphraseFormatUsesWords,
  resolvePassphraseFormat,
  resolvePassphraseOptions,
  validatePassphraseFormat,
} from "./passphrase-format.ts";
export type { PassphraseOptions, PassphrasePreferenceValues } from "./passphrase-format.ts";

export function generatePassphrase(format: string, dictionaryWords?: string[]): string {
  const formatErrors = validatePassphraseFormat(format);

  if (formatErrors.length > 0) {
    throw new Error(formatErrors[0]);
  }

  const formatNeedsWords = passphraseFormatUsesWords(format);
  const usableDictionaryWords = formatNeedsWords ? (dictionaryWords ?? []) : [];

  if (formatNeedsWords && usableDictionaryWords.length === 0) {
    throw new Error("No usable dictionary words found.");
  }

  const randomNumberSlotCount = format.match(/{number:random}/g)?.length ?? 0;
  const randomNumberSlot = randomNumberSlotCount > 0 ? crypto.randomInt(randomNumberSlotCount) : -1;
  let randomNumberSlotIndex = 0;

  return format.replace(/{(\w+)(:(\w+))?}/g, (match, type, _, modifier) => {
    switch (type) {
      case "word":
        return formatWord(usableDictionaryWords[crypto.randomInt(usableDictionaryWords.length)], modifier);
      case "random":
        return generateRandomChars(randomCharacters, getLengthModifier(modifier));
      case "symbol":
        return generateRandomChars(symbols, getLengthModifier(modifier));
      case "number":
        if (modifier === "random") {
          return randomNumberSlotIndex++ === randomNumberSlot ? generateRandomChars(numbers, 1) : "";
        }

        return generateRandomChars(numbers, getLengthModifier(modifier));
      default:
        return match;
    }
  });
}

function getLengthModifier(modifier: string | undefined): number {
  return modifier ? Number.parseInt(modifier, 10) : 1;
}

function formatWord(word: string, modifier: string | undefined): string {
  switch (modifier) {
    case "uppercase":
      return word.toUpperCase();
    case "lowercase":
      return word.toLowerCase();
    case "capitalize":
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    default:
      return crypto.randomInt(2) === 0 ? word : word.toUpperCase();
  }
}

function generateRandomChars(charset: string, length: number): string {
  return Array.from({ length }, () => charset[crypto.randomInt(charset.length)]).join("");
}

export function passphraseEntropyBits(format: string, dictionarySize: number): number {
  let bits = 0;
  let countedRandomDigit = false;

  for (const [, type, modifier] of format.matchAll(/{(\w+)(?::(\w+))?}/g)) {
    if (type === "word") {
      bits += Math.log2(dictionarySize);
    } else if (type === "number" && modifier === "random") {
      if (!countedRandomDigit) {
        bits += Math.log2(numbers.length);
        countedRandomDigit = true;
      }
    } else {
      const charset = type === "number" ? numbers : type === "symbol" ? symbols : randomCharacters;
      bits += getLengthModifier(modifier) * Math.log2(charset.length);
    }
  }

  return bits;
}
