// Layout maps for KeyMap Fix.
// All maps are character-by-character substitutions on the same physical key position.

export type Direction = "en2ar" | "ar2en" | "en2fr" | "fr2en";

// QWERTY (US) → Arabic (macOS Arabic layout, unshifted + shifted).
// Reference: macOS "Arabic" input source. Keys that have no Arabic equivalent
// (digits, most punctuation) pass through unchanged via the converter.
const EN_TO_AR_PAIRS: Array<[string, string]> = [
  ["q", "ض"],
  ["w", "ص"],
  ["e", "ث"],
  ["r", "ق"],
  ["t", "ف"],
  ["y", "غ"],
  ["u", "ع"],
  ["i", "ه"],
  ["o", "خ"],
  ["p", "ح"],
  ["[", "ج"],
  ["]", "د"],
  ["a", "ش"],
  ["s", "س"],
  ["d", "ي"],
  ["f", "ب"],
  ["g", "ل"],
  ["h", "ا"],
  ["j", "ت"],
  ["k", "ن"],
  ["l", "م"],
  [";", "ك"],
  ["'", "ط"],
  ["z", "ئ"],
  ["x", "ء"],
  ["c", "ؤ"],
  ["v", "ر"],
  ["b", "لا"],
  ["n", "ى"],
  ["m", "ة"],
  [",", "و"],
  [".", "ز"],
  ["/", "ظ"],
  // Shifted row — common diacritics and punctuation.
  ["Q", "َ"],
  ["W", "ً"],
  ["E", "ُ"],
  ["R", "ٌ"],
  ["T", "لإ"],
  ["Y", "إ"],
  ["U", "`"],
  ["I", "÷"],
  ["O", "×"],
  ["P", "؛"],
  ["{", "<"],
  ["}", ">"],
  ["A", "ِ"],
  ["S", "ٍ"],
  ["D", "]"],
  ["F", "["],
  ["G", "لأ"],
  ["H", "أ"],
  ["J", "ـ"],
  ["K", "،"],
  ["L", "/"],
  [":", ":"],
  ['"', '"'],
  ["Z", "~"],
  ["X", "ْ"],
  ["C", "}"],
  ["V", "{"],
  ["B", "لآ"],
  ["N", "آ"],
  ["M", "'"],
  ["<", ","],
  [">", "."],
  ["?", "؟"],
];

// QWERTY (US) ↔ AZERTY (French) — top three rows differ in the well-known positions.
// Letter rows.
const EN_TO_FR_PAIRS: Array<[string, string]> = [
  ["q", "a"],
  ["a", "q"],
  ["w", "z"],
  ["z", "w"],
  ["m", ","],
  [",", ";"],
  [";", "m"],
  ["Q", "A"],
  ["A", "Q"],
  ["W", "Z"],
  ["Z", "W"],
  ["M", "?"],
  ["<", "."],
  [":", "M"],
  // Digits on AZERTY are produced with shift on the same key positions; we map
  // the QWERTY digit characters to what AZERTY produces unshifted on that key.
  ["1", "&"],
  ["2", "é"],
  ["3", '"'],
  ["4", "'"],
  ["5", "("],
  ["6", "-"],
  ["7", "è"],
  ["8", "_"],
  ["9", "ç"],
  ["0", "à"],
];

function invert(pairs: Array<[string, string]>): Array<[string, string]> {
  return pairs.map(([a, b]) => [b, a]);
}

function buildMap(pairs: Array<[string, string]>): Map<string, string> {
  const m = new Map<string, string>();
  for (const [from, to] of pairs) {
    if (!m.has(from)) m.set(from, to);
  }
  return m;
}

const MAPS: Record<Direction, Map<string, string>> = {
  en2ar: buildMap(EN_TO_AR_PAIRS),
  ar2en: buildMap(invert(EN_TO_AR_PAIRS)),
  en2fr: buildMap(EN_TO_FR_PAIRS),
  fr2en: buildMap(invert(EN_TO_FR_PAIRS)),
};

// Multi-character source keys (e.g. "لا" → "b") need to be matched first.
const MULTI_CHAR_KEYS: Record<Direction, string[]> = {
  en2ar: [],
  ar2en: Array.from(MAPS.ar2en.keys()).filter((k) => k.length > 1),
  en2fr: [],
  fr2en: [],
};

export function convert(text: string, direction: Direction): string {
  const map = MAPS[direction];
  const multi = MULTI_CHAR_KEYS[direction];
  let out = "";
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const key of multi) {
      if (text.startsWith(key, i)) {
        out += map.get(key)!;
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const ch = text[i];
    out += map.get(ch) ?? ch;
    i++;
  }
  return out;
}

const ARABIC_RANGE = /[؀-ۿ]/;

export function detectDirection(
  text: string,
  azertyEnabled: boolean,
): Direction {
  if (ARABIC_RANGE.test(text)) return "ar2en";
  // Heuristic: if the text has characters that only exist on AZERTY (éèçà)
  // and AZERTY mode is on, assume fr2en. Otherwise default to en2ar.
  if (azertyEnabled && /[éèçàù]/i.test(text)) return "fr2en";
  return "en2ar";
}

export function directionLabel(d: Direction): string {
  switch (d) {
    case "en2ar":
      return "EN → AR";
    case "ar2en":
      return "AR → EN";
    case "en2fr":
      return "EN → FR";
    case "fr2en":
      return "FR → EN";
  }
}

export function reverse(d: Direction): Direction {
  switch (d) {
    case "en2ar":
      return "ar2en";
    case "ar2en":
      return "en2ar";
    case "en2fr":
      return "fr2en";
    case "fr2en":
      return "en2fr";
  }
}
