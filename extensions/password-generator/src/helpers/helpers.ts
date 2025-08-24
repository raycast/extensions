import crypto from "node:crypto";

import { words } from "@/words";

const numbers = "23456789";
const symbols = "!@#$*^&%";

export function generatePassword(len: number, useNumbers: boolean, useChars: boolean): string {
  const baseCharset = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  let fullCharset = baseCharset;

  if (useNumbers) fullCharset += numbers;
  if (useChars) fullCharset += symbols;

  const result: string[] = [];

  // Reserve guaranteed positions
  if (useNumbers) result.push(numbers[crypto.randomInt(numbers.length)]);
  if (useChars) result.push(symbols[crypto.randomInt(symbols.length)]);

  // Fill remaining positions from full charset
  while (result.length < len) {
    result.push(fullCharset[crypto.randomInt(fullCharset.length)]);
  }

  // Shuffle to avoid predictable patterns
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
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
