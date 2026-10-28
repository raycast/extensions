const MAX_MUNCH_LENGTH = 4;

const PHONETIC_MAP: Record<string, string[]> = {
  а: ["a"],
  б: ["b"],
  в: ["v"],
  г: ["g"],
  д: ["d"],
  е: ["e"],
  ё: ["yo", "jo", "ö"],
  ж: ["zh"],
  з: ["z"],
  и: ["i"],
  й: ["j"],
  к: ["k"],
  л: ["l"],
  м: ["m"],
  н: ["n"],
  о: ["o"],
  п: ["p"],
  р: ["r"],
  с: ["s"],
  т: ["t"],
  у: ["u"],
  ф: ["f"],
  х: ["h", "x"],
  ц: ["c"],
  ч: ["ch"],
  ш: ["sh"],
  щ: ["shch", "shh", "w"],
  ъ: ["#", "tvz"],
  Ъ: ["##"],
  ы: ["y"],
  ь: ["'", "mjz"],
  Ь: ["''"],
  э: ["je", "ä"],
  ю: ["yu", "ju", "ü"],
  я: ["ya", "ja", "q"],
};

// Create reverse mapping for Latin to Cyrillic conversion
const REVERSE_PHONETIC_MAP = Object.entries(PHONETIC_MAP).reduce<Record<string, string>>(
  (acc, [cyrillic, latinVariants]) => {
    latinVariants.forEach((latin) => {
      acc[latin] = cyrillic;
    });
    return acc;
  },
  {},
);

/**
 * Checks if a character is a letter
 * @param char - Single character to check
 * @returns boolean indicating if the character is a letter
 */
function isLetter(char: string): boolean {
  return char.toLowerCase() !== char.toUpperCase();
}

/**
 * Checks if a character is an uppercase letter
 * @param char - Character to check, possibly undefined at string boundaries
 * @returns boolean indicating if the character is an uppercase letter
 */
function isUppercaseLetter(char: string | undefined): boolean {
  return char !== undefined && isLetter(char) && char === char.toUpperCase();
}

/**
 * Converts Latin text to Cyrillic using phonetic transliteration
 * @param input - Latin text to convert
 * @returns Transliterated Cyrillic text
 */
export function transliterateLatinToCyrillic(input: string): string {
  // Normalize decomposed diacritics (e.g. NFD "o" + U+0308) so they match the map
  const normalized = input.normalize("NFC");
  let result = "";
  let i = 0;

  while (i < normalized.length) {
    let currentLength = MAX_MUNCH_LENGTH;
    let matched = false;

    // Try to match longest possible sequence first
    while (currentLength >= 1) {
      const sequence = normalized.slice(i, i + currentLength);
      const cyrillicChar = REVERSE_PHONETIC_MAP[sequence.toLowerCase()];

      if (cyrillicChar) {
        // For letter sequences, take the case from the first Latin letter.
        // For non-letter markers (hard sign "#", soft sign "'"), take the case
        // from the surrounding letters so that e.g. "OB#EKT" becomes "ОБЪЕКТ".
        const shouldUppercase = isLetter(sequence[0])
          ? sequence[0] === sequence[0].toUpperCase()
          : isUppercaseLetter(result[result.length - 1]) && isUppercaseLetter(normalized[i + currentLength]);
        result += shouldUppercase ? cyrillicChar.toUpperCase() : cyrillicChar.toLowerCase();
        i += currentLength;
        matched = true;
        break;
      }
      currentLength--;
    }

    // If no match found, keep the original character
    if (!matched) {
      result += normalized[i];
      i++;
    }
  }

  return result;
}
