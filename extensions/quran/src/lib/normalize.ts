// Exact port of obsidian-quran-helper-plugin src/utils.ts (search-relevant parts)

// Arabic numerals (Eastern Arabic) to Western Arabic numerals mapping
const ARABIC_NUMERALS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

/**
 * Convert Arabic numerals (٠١٢٣...) to Western Arabic numerals (0123...)
 */
export function convertArabicNumerals(text: string): string {
  return text.replace(/[٠-٩]/g, (char) => ARABIC_NUMERALS[char] ?? char);
}

// Regex to match a string containing only numerals (Western or Arabic)
const ALL_NUMERALS_REGEX = /^[\d٠-٩]+$/;

// Regex to match surah:ayah format (Western or Arabic numerals)
const SURAH_AYAH_REGEX = /^([\d٠-٩]+):([\d٠-٩]+)$/;

/**
 * Check if text consists only of numerals (Western or Arabic)
 */
export function isNumericQuery(text: string): boolean {
  return ALL_NUMERALS_REGEX.test(text.trim());
}

/**
 * Check if text is in surah:ayah format (supports both Western and Arabic numerals)
 */
export function isSurahAyahQuery(text: string): RegExpExecArray | null {
  return SURAH_AYAH_REGEX.exec(text.trim());
}

/**
 * Parse a numeric string (Western or Arabic numerals) to a number
 */
export function parseNumericString(text: string): number {
  return parseInt(convertArabicNumerals(text), 10);
}

// Function to normalize Arabic text for search
export function normalizeArabic(text: string): string {
  return (
    text
      // Remove diacritics (tashkeel)
      .replace(/[\u0617-\u061A\u06D6\u06D7\u064B-\u065E\u0652]/g, "")
      // Remove small alef (alef khanjariya)
      .replace(/\u0670/g, "")
      // Normalize alef wasla and alef variants
      .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
      // Normalize taa marbuta
      .replace(/\u06C3/g, "\u0629")
      // Normalize waw variants
      .replace(/\u0624/g, "\u0648")
      // Remove extended arabic letters
      .replace(/[\u06D5\u06EE\u06EF]/g, "")
      // Remove QPC marks (stop signs, small high forms, sajdah, etc.)
      .replace(/[\u06D6-\u06DC\u06DE-\u06ED]/g, "")
      // Remove any remaining double spaces
      .replace(/\s+/g, " ")
  );
}
