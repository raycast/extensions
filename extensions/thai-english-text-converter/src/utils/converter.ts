export type Direction = "en-to-th" | "th-to-en";

export type ConvertResult = {
  converted: string;
  direction: Direction;
  changed: boolean;
};

// Kedmanee Thai keyboard layout — the macOS / Windows default.
// Each tuple is [englishKey, thaiKey] at the same physical position,
// covering both the unshifted and shifted states of the alphanumeric block.
const KEYBOARD_PAIRS: ReadonlyArray<readonly [string, string]> = [
  // Number row — unshifted
  ["1", "ๅ"],
  ["2", "/"],
  ["3", "-"],
  ["4", "ภ"],
  ["5", "ถ"],
  ["6", "ุ"],
  ["7", "ึ"],
  ["8", "ค"],
  ["9", "ต"],
  ["0", "จ"],
  ["-", "ข"],
  ["=", "ช"],
  // Number row — shifted
  ["!", "+"],
  ["@", "๑"],
  ["#", "๒"],
  ["$", "๓"],
  ["%", "๔"],
  ["^", "ู"],
  ["&", "฿"],
  ["*", "๕"],
  ["(", "๖"],
  [")", "๗"],
  ["_", "๘"],
  ["+", "๙"],
  // Top letter row — unshifted
  ["q", "ๆ"],
  ["w", "ไ"],
  ["e", "ำ"],
  ["r", "พ"],
  ["t", "ะ"],
  ["y", "ั"],
  ["u", "ี"],
  ["i", "ร"],
  ["o", "น"],
  ["p", "ย"],
  ["[", "บ"],
  ["]", "ล"],
  ["\\", "ฃ"],
  // Top letter row — shifted
  ["Q", "๐"],
  ["W", '"'],
  ["E", "ฎ"],
  ["R", "ฑ"],
  ["T", "ธ"],
  ["Y", "ํ"],
  ["U", "๊"],
  ["I", "ณ"],
  ["O", "ฯ"],
  ["P", "ญ"],
  ["{", "ฐ"],
  ["}", ","],
  ["|", "ฅ"],
  // Home row — unshifted
  ["a", "ฟ"],
  ["s", "ห"],
  ["d", "ก"],
  ["f", "ด"],
  ["g", "เ"],
  ["h", "้"],
  ["j", "่"],
  ["k", "า"],
  ["l", "ส"],
  [";", "ว"],
  ["'", "ง"],
  // Home row — shifted
  ["A", "ฤ"],
  ["S", "ฆ"],
  ["D", "ฏ"],
  ["F", "โ"],
  ["G", "ฌ"],
  ["H", "็"],
  ["J", "๋"],
  ["K", "ษ"],
  ["L", "ศ"],
  [":", "ซ"],
  ['"', "."],
  // Bottom row — unshifted
  ["z", "ผ"],
  ["x", "ป"],
  ["c", "แ"],
  ["v", "อ"],
  ["b", "ิ"],
  ["n", "ื"],
  ["m", "ท"],
  [",", "ม"],
  [".", "ใ"],
  ["/", "ฝ"],
  // Bottom row — shifted
  ["Z", "("],
  ["X", ")"],
  ["C", "ฉ"],
  ["V", "ฮ"],
  ["B", "ฺ"],
  ["N", "์"],
  ["M", "?"],
  ["<", "ฒ"],
  [">", "ฬ"],
  ["?", "ฦ"],
];

// Build lookup maps. When the Thai side collides (e.g. multiple Thai keys
// nominally map to the same character via odd shifted positions), the first
// pair wins — this is the conventional behavior for Kedmanee converters.
const EN_TO_TH: ReadonlyMap<string, string> = new Map(KEYBOARD_PAIRS);
const TH_TO_EN: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [en, th] of KEYBOARD_PAIRS) {
    if (!m.has(th)) m.set(th, en);
  }
  return m;
})();

// Thai Unicode block: U+0E00–U+0E7F
const THAI_CHAR = /[฀-๿]/;

export function detectDirection(text: string): Direction {
  return THAI_CHAR.test(text) ? "th-to-en" : "en-to-th";
}

export function convertText(text: string): ConvertResult {
  const direction = detectDirection(text);
  const table = direction === "th-to-en" ? TH_TO_EN : EN_TO_TH;

  let changed = false;
  let converted = "";
  for (const ch of text) {
    const mapped = table.get(ch);
    if (mapped !== undefined) {
      converted += mapped;
      if (mapped !== ch) changed = true;
    } else {
      converted += ch;
    }
  }

  return { converted, direction, changed };
}
