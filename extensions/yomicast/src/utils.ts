import wanakana from "wanakana";

/**
 * A tagged template literal for SQL strings to allow for formatting and syntax
 * highlighting.
 */
export function sql(strings: TemplateStringsArray, ...expr: unknown[]) {
  return strings.map((str, index) => str + (expr.length > index ? String(expr[index]) : "")).join("");
}

/** Normalizes a romaji or katakana string to hiragana for searching and indexing. */
export function normalizeKana(text: string) {
  const trimmedText = text.trim().toLowerCase();
  return wanakana.toHiragana(trimmedText, {
    // Don't convert long vowel marks to hiragana
    // (e.g. ケーキ -> けえき. Instead, it should be けーき)
    convertLongVowelMark: false,
  });
}
