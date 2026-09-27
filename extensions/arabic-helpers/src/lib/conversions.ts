const WESTERN_DIGITS = "0123456789";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const UNICODE_MARK = /^\p{Mark}$/u;
const ARABIC_SCRIPT = /^\p{Script_Extensions=Arabic}$/u;

export type NumeralSystem = "western" | "arabic-indic";
export type HarakatPair = {
  withHarakat: string;
  withoutHarakat: string;
};

function translateDigits(text: string, sourceDigits: string, targetDigits: string): string {
  return Array.from(text, (character) => {
    const index = sourceDigits.indexOf(character);
    return index === -1 ? character : targetDigits[index];
  }).join("");
}

export function toArabicIndicNumerals(text: string): string {
  return translateDigits(text, WESTERN_DIGITS, ARABIC_INDIC_DIGITS);
}

export function toWesternNumerals(text: string): string {
  return translateDigits(text, ARABIC_INDIC_DIGITS, WESTERN_DIGITS);
}

export function detectFirstNumeralSystem(text: string): NumeralSystem | undefined {
  for (const character of text) {
    if (WESTERN_DIGITS.includes(character)) return "western";
    if (ARABIC_INDIC_DIGITS.includes(character)) return "arabic-indic";
  }

  return undefined;
}

function isArabicCombiningMark(character: string): boolean {
  return UNICODE_MARK.test(character) && ARABIC_SCRIPT.test(character);
}

export function containsArabicHarakat(text: string): boolean {
  return Array.from(text).some(isArabicCombiningMark);
}

export function stripArabicHarakat(text: string): string {
  return Array.from(text)
    .filter((character) => !isArabicCombiningMark(character))
    .join("")
    .replaceAll("ٱ", "ا");
}

export function deriveHarakatPair(markedText: string): HarakatPair {
  return {
    withHarakat: markedText,
    withoutHarakat: stripArabicHarakat(markedText),
  };
}

export function updatePlainTextPreservingHarakat(currentPair: HarakatPair, plainText: string): HarakatPair {
  return {
    withHarakat: currentPair.withHarakat,
    withoutHarakat: stripArabicHarakat(plainText),
  };
}

export function isValidHarakatResult(plainText: string, generatedText: string): boolean {
  return generatedText.length > 0 && stripArabicHarakat(generatedText) === stripArabicHarakat(plainText);
}

export function createHarakatPrompt(plainText: string): string {
  return [
    "Act only as an Arabic diacritization engine.",
    "Add grammatically appropriate Arabic harakat to the Arabic text in the JSON string below.",
    "Return only the diacritized text, without quotes, Markdown, commentary, or code fences.",
    "Preserve every letter, word, numeral, punctuation mark, line break, space, and its exact position.",
    `Input JSON string: ${JSON.stringify(plainText)}`,
  ].join("\n");
}
