/*
  Centralized character sets and helpers for detection & cleaning.
*/

export const INVISIBLE_RANGES = [
  "\u200B-\u200D", // zero width space, non-joiner, joiner
  "\u200E-\u200F", // LRM, RLM
  "\u202A-\u202E", // bidi embedding/override
  "\u2066-\u2069", // bidi isolate
  "\u180B-\u180D", // Mongolian variation selectors 1-3
  "\uFE00-\uFE0F", // variation selectors
];

// Single code points that are invisible or formatting marks
export const INVISIBLE_SINGLES = [
  "\u00AD", // soft hyphen
  "\u034F", // grapheme joiner
  "\uFEFF", // zero width no-break space / BOM
];

// Hangul/Khmer fillers and others (some render as blank width); treat as removable
export const FILLERS_VISIBLE_OR_BLANK = [
  "\u3164", // Hangul Filler
  "\u115F", // Hangul Choseong Filler
  "\u1160", // Hangul Jungseong Filler
  "\u17B4", // Khmer Vowel Inherent AQ
  "\u17B5", // Khmer Vowel Inherent AA
];

// Spaces that are visible but non-standard; normalize to regular space in All Unicode mode
export const SPECIAL_SPACES_RANGES = [
  "\u2000-\u200A", // various en/thin spaces
];
export const SPECIAL_SPACES_SINGLES = [
  "\u00A0", // NBSP
  "\u202F", // narrow no-break space
  "\u205F", // medium mathematical space
  "\u3000", // ideographic space
  "\u180E", // Mongolian vowel separator (historically spacing)
];

// Visible but non-keyboard typography
export const SMART_QUOTES = ["\u2018", "\u2019", "\u201C", "\u201D"]; // ‘ ’ “ ”
export const DASHES = ["\u2013", "\u2014"]; // – —
export const ELLIPSIS = "\u2026"; // …

export function buildCharClass(parts: string[]): string {
  return parts.join("");
}

export const INVISIBLE_CLASS = `[${buildCharClass(INVISIBLE_RANGES)}${INVISIBLE_SINGLES.join("")}]`;
export const FILLERS_CLASS = `[${FILLERS_VISIBLE_OR_BLANK.join("")}]`;
export const SPECIAL_SPACES_CLASS = `[${buildCharClass(SPECIAL_SPACES_RANGES)}${SPECIAL_SPACES_SINGLES.join("")}]`;

export const NON_KEYBOARD_CLASS = `[${SMART_QUOTES.join("")}${DASHES.join("")}${ELLIPSIS}]`;

export const ASCII_ALLOWED_IN_ALL = /[\n\r\t \x20-\x7E]/;

export function codePointToHex(cp: number): string {
  return `U+${cp.toString(16).toUpperCase()}`;
}
