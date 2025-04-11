import crypto from "node:crypto";

import { words } from "@/words";

const numbers = "23456789";
const symbols = "!@#$*^&%";

export function generatePassword(len: number, useNumbers: boolean, useChars: boolean): string {
  let charset = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

  if (useNumbers) {
    charset += numbers;
  }

  if (useChars) {
    charset += symbols;
  }

  let retVal = "";

  for (let i = 0; i < len; ++i) {
    retVal += charset.charAt(crypto.randomInt(charset.length));
  }

  return retVal;
}

export function generateCustomPassword(format: string): string {
  // Set to keep track of used words to avoid repetition
  const usedWords = new Set<string>();

  // Generates a string of random characters from a given charset
  function generateRandomChars(charset: string, length: number): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset[crypto.randomInt(charset.length)];
    }
    return result;
  }

  // Replace each format placeholder with the corresponding generated content.
  // This regex matches placeholders in the format {type:modifier}
  // where type is a word (e.g., word, random, symbol, number)
  // and modifier is optional (e.g., uppercase, lowercase, or a number for length)
  return format.replace(/{(\w+)(:(\w+))?}/g, (match, type, _, modifier) => {
    const length = parseInt(modifier, 10) || 1;
    let word;

    switch (type) {
      case "word":
        // Keep generating words until we find one that hasn't been used
        do {
          word = words[crypto.randomInt(words.length)].trim();
        } while (usedWords.has(word));

        usedWords.add(word);
        // Apply the appropriate case modification
        if (modifier === "uppercase") {
          return word.toUpperCase();
        } else if (modifier === "lowercase") {
          return word.toLowerCase();
        } else if (modifier === "capitalize") {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        } else {
          // If no case is specified, randomly choose uppercase or lowercase
          return crypto.randomInt(2) === 0 ? word : word.toUpperCase();
        }
      case "random":
        return generatePassword(length, true, true);
      case "symbol":
        return generateRandomChars(symbols, length);
      case "number":
        return generateRandomChars(numbers, length);
      default:
        return match;
    }
  });
}
