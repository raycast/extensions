/**
 * Keyboard layout mapping tables.
 *
 * Two Arabic layouts are supported, because they are genuinely different
 * keyboards rather than variations on one:
 *
 *   windows — "Arabic (101)", the standard PC layout. Also what macOS calls
 *             "Arabic - PC".
 *   mac     — macOS's default "Arabic" layout. The whole bottom row is
 *             rearranged (ر is on n, not v), there are no lam-alef ligature
 *             keys, and the number row types Arabic-Indic digits.
 *
 * The mac table was extracted from macOS itself via UCKeyTranslate rather than
 * transcribed by hand, and matches the system layout on all 94 keys.
 */

export type Variant = "mac" | "windows";
export type Direction = "en2ar" | "ar2en";

/**
 * [ what a US-QWERTY layout produces , what the Arabic layout produces ]
 * for the same physical keystroke. Order matters: when two keys produce the
 * same Arabic character, the first one listed wins the reverse mapping.
 */
type KeyPair = readonly [string, string];

// ── Arabic (101) — Windows, and macOS "Arabic - PC" ────────────────────────
// prettier-ignore
const WINDOWS_KEYS: readonly KeyPair[] = [
  ["`", "ذ"],
  ["q", "ض"], ["w", "ص"], ["e", "ث"], ["r", "ق"], ["t", "ف"], ["y", "غ"],
  ["u", "ع"], ["i", "ه"], ["o", "خ"], ["p", "ح"], ["[", "ج"], ["]", "د"],
  ["a", "ش"], ["s", "س"], ["d", "ي"], ["f", "ب"], ["g", "ل"], ["h", "ا"],
  ["j", "ت"], ["k", "ن"], ["l", "م"], [";", "ك"], ["'", "ط"],
  ["z", "ئ"], ["x", "ء"], ["c", "ؤ"], ["v", "ر"], ["b", "لا"], ["n", "ى"],
  ["m", "ة"], [",", "و"], [".", "ز"], ["/", "ظ"],

  ["~", "\u0651"], // shadda
  ["Q", "\u064E"], ["W", "\u064B"], ["E", "\u064F"], // fatha fathatan damma
  ["R", "\u064C"], // dammatan
  ["T", "لإ"], ["Y", "إ"], ["U", "\u2018"],
  ["I", "÷"], ["O", "×"], ["P", "\u061B"], ["{", "<"], ["}", ">"],
  ["A", "\u0650"], ["S", "\u064D"], // kasra kasratan
  ["D", "]"], ["F", "["], ["G", "لأ"], ["H", "أ"],
  ["J", "\u0640"], ["K", "\u060C"], ["L", "/"], // tatweel, Arabic comma
  ["Z", "~"], ["X", "\u0652"], ["C", "}"], ["V", "{"], // sukun
  ["B", "لآ"], ["N", "آ"], ["M", "\u2019"],
  ["<", ","], [">", "."], ["?", "\u061F"],
];

/**
 * Windows Arabic 101 types ASCII digits, so these only ever travel one way —
 * useful when the Arabic text came from somewhere else.
 */
// prettier-ignore
const WINDOWS_AR_ONLY: readonly KeyPair[] = [
  ["٠", "0"], ["١", "1"], ["٢", "2"], ["٣", "3"], ["٤", "4"],
  ["٥", "5"], ["٦", "6"], ["٧", "7"], ["٨", "8"], ["٩", "9"],
];

// ── macOS "Arabic" ─────────────────────────────────────────────────────────
// Both `_` and ` produce tatweel; `_` is listed first so it wins the reverse
// mapping, being far more common in English text than a backtick.
// prettier-ignore
const MAC_KEYS: readonly KeyPair[] = [
  ["_", "\u0640"], ["`", "\u0640"], // tatweel
  ["1", "١"], ["2", "٢"], ["3", "٣"], ["4", "٤"], ["5", "٥"],
  ["6", "٦"], ["7", "٧"], ["8", "٨"], ["9", "٩"], ["0", "٠"],
  ["q", "ض"], ["w", "ص"], ["e", "ث"], ["r", "ق"], ["t", "ف"], ["y", "غ"],
  ["u", "ع"], ["i", "ه"], ["o", "خ"], ["p", "ح"], ["[", "ج"], ["]", "ة"],
  ["a", "ش"], ["s", "س"], ["d", "ي"], ["f", "ب"], ["g", "ل"], ["h", "ا"],
  ["j", "ت"], ["k", "ن"], ["l", "م"], [";", "ك"], ["'", "\u061B"],
  ["z", "ظ"], ["x", "ط"], ["c", "ذ"], ["v", "د"], ["b", "ز"], ["n", "ر"],
  ["m", "و"], [",", "\u060C"],

  ["%", "\u066A"], ["(", ")"], [")", "("], // Arabic percent; mirrored parens
  ["Q", "\u064E"], ["W", "\u064B"], ["E", "\u0650"], ["R", "\u064D"],
  ["T", "\u064F"], ["Y", "\u064C"], ["U", "\u0652"], ["I", "\u0651"],
  ["O", "]"], ["P", "["], ["{", "}"], ["}", "{"], // mirrored brackets
  ["A", "»"], ["S", "«"],
  ["D", "ى"], ["H", "آ"],
  ["K", "\u066B"], ["L", "\u066C"], // Arabic decimal / thousands separators
  ["Z", "'"], ["C", "ئ"], ["V", "ء"], ["B", "أ"], ["N", "إ"], ["M", "ؤ"],
  ["<", ">"], [">", "<"], ["?", "\u061F"], // mirrored angles
];

/**
 * Ligature presentation forms some editors normalise to. Expanded to their
 * base letters before mapping, so this works for both layouts.
 */
// prettier-ignore
const LIGATURES: readonly KeyPair[] = [
  ["\uFEFB", "لا"], ["\uFEFC", "لا"],
  ["\uFEF7", "لأ"], ["\uFEF8", "لأ"],
  ["\uFEF9", "لإ"], ["\uFEFA", "لإ"],
  ["\uFEF5", "لآ"], ["\uFEF6", "لآ"],
];

interface Table {
  enToArMap: Map<string, string>;
  arToEnMap: Map<string, string>;
  maxSeq: number;
}

function build(keys: readonly KeyPair[], arabicOnly: readonly KeyPair[] = []): Table {
  const enToArMap = new Map<string, string>();
  const arToEnMap = new Map<string, string>();
  for (const [en, ar] of keys) {
    if (!enToArMap.has(en)) enToArMap.set(en, ar);
    if (!arToEnMap.has(ar)) arToEnMap.set(ar, en);
  }
  for (const [ar, en] of arabicOnly) {
    if (!arToEnMap.has(ar)) arToEnMap.set(ar, en);
  }
  const maxSeq = Math.max(...[...arToEnMap.keys()].map((k) => k.length));
  return { enToArMap, arToEnMap, maxSeq };
}

// Built on first use, so a command only ever pays for the layout it needs.
const cache = new Map<Variant, Table>();

function table(variant: Variant): Table {
  let built = cache.get(variant);
  if (!built) {
    built = variant === "mac" ? build(MAC_KEYS) : build(WINDOWS_KEYS, WINDOWS_AR_ONLY);
    cache.set(variant, built);
  }
  return built;
}

/** Latin keystrokes → the Arabic the user meant to type. */
export function enToAr(text: string, variant: Variant): string {
  const { enToArMap } = table(variant);
  let out = "";
  for (const ch of text) out += enToArMap.get(ch) ?? ch;
  return out;
}

/** Arabic keystrokes → the Latin the user meant to type. */
export function arToEn(text: string, variant: Variant): string {
  const { arToEnMap, maxSeq } = table(variant);

  let source = text;
  for (const [form, base] of LIGATURES) {
    if (source.includes(form)) source = source.split(form).join(base);
  }

  let out = "";
  let i = 0;
  while (i < source.length) {
    let matched = false;
    for (let len = maxSeq; len > 1; len--) {
      const seq = source.substr(i, len);
      if (seq.length === len && arToEnMap.has(seq)) {
        out += arToEnMap.get(seq);
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    out += arToEnMap.get(source[i]) ?? source[i];
    i += 1;
  }
  return out;
}

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN_RE = /[A-Za-z]/g;

/**
 * Guess which way to convert by counting script. Mostly-Arabic text was typed
 * on an Arabic layout when English was wanted, and vice versa. This also makes
 * the command a toggle: run it twice and you are back where you started.
 */
export function detect(text: string): Direction {
  const arabic = text.match(ARABIC_RE)?.length ?? 0;
  const latin = text.match(LATIN_RE)?.length ?? 0;
  return arabic > latin ? "ar2en" : "en2ar";
}

export function convert(text: string, direction: Direction, variant: Variant): string {
  return direction === "ar2en" ? arToEn(text, variant) : enToAr(text, variant);
}

/** Convert using the auto-detected direction. */
export function fix(text: string, variant: Variant): { direction: Direction; text: string } {
  const direction = detect(text);
  return { direction, text: convert(text, direction, variant) };
}
