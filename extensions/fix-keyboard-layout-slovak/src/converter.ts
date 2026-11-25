/**
 * Converts text typed with the wrong keyboard layout between English (US / ABC)
 * and Slovak (QWERTY or QWERTZ) macOS layouts.
 *
 * Text is first turned back into the physical keystrokes that produced it
 * (using the source layout) and those keystrokes are then replayed on the
 * target layout – including Slovak dead keys (´ and ˇ).
 *
 * Key tables were generated from macOS (UCKeyTranslate) for the layouts
 * com.apple.keylayout.ABC, com.apple.keylayout.Slovak-QWERTY and com.apple.keylayout.Slovak.
 */

export type LayoutId = "en" | "sk-qwerty" | "sk-qwertz";

/** [unshifted, shifted]; `null` marks a dead key. */
type KeyOutput = [string | null, string | null];

const DEAD = null;

// [keyCode, ABC, Slovak-QWERTY, Slovak (QWERTZ)]
const KEYS: [number, KeyOutput, KeyOutput, KeyOutput][] = [
  [0, ["a", "A"], ["a", "A"], ["a", "A"]],
  [1, ["s", "S"], ["s", "S"], ["s", "S"]],
  [2, ["d", "D"], ["d", "D"], ["d", "D"]],
  [3, ["f", "F"], ["f", "F"], ["f", "F"]],
  [4, ["h", "H"], ["h", "H"], ["h", "H"]],
  [5, ["g", "G"], ["g", "G"], ["g", "G"]],
  [6, ["z", "Z"], ["z", "Z"], ["y", "Y"]],
  [7, ["x", "X"], ["x", "X"], ["x", "X"]],
  [8, ["c", "C"], ["c", "C"], ["c", "C"]],
  [9, ["v", "V"], ["v", "V"], ["v", "V"]],
  [11, ["b", "B"], ["b", "B"], ["b", "B"]],
  [12, ["q", "Q"], ["q", "Q"], ["q", "Q"]],
  [13, ["w", "W"], ["w", "W"], ["w", "W"]],
  [14, ["e", "E"], ["e", "E"], ["e", "E"]],
  [15, ["r", "R"], ["r", "R"], ["r", "R"]],
  [16, ["y", "Y"], ["y", "Y"], ["z", "Z"]],
  [17, ["t", "T"], ["t", "T"], ["t", "T"]],
  [18, ["1", "!"], ["+", "1"], ["+", "1"]],
  [19, ["2", "@"], ["ľ", "2"], ["ľ", "2"]],
  [20, ["3", "#"], ["š", "3"], ["š", "3"]],
  [21, ["4", "$"], ["č", "4"], ["č", "4"]],
  [22, ["6", "^"], ["ž", "6"], ["ž", "6"]],
  [23, ["5", "%"], ["ť", "5"], ["ť", "5"]],
  [24, ["=", "+"], [DEAD, DEAD], [DEAD, DEAD]],
  [25, ["9", "("], ["í", "9"], ["í", "9"]],
  [26, ["7", "&"], ["ý", "7"], ["ý", "7"]],
  [27, ["-", "_"], ["=", "%"], ["=", "%"]],
  [28, ["8", "*"], ["á", "8"], ["á", "8"]],
  [29, ["0", ")"], ["é", "0"], ["é", "0"]],
  [30, ["]", "}"], ["ä", "("], ["ä", "("]],
  [31, ["o", "O"], ["o", "O"], ["o", "O"]],
  [32, ["u", "U"], ["u", "U"], ["u", "U"]],
  [33, ["[", "{"], ["ú", "/"], ["ú", "/"]],
  [34, ["i", "I"], ["i", "I"], ["i", "I"]],
  [35, ["p", "P"], ["p", "P"], ["p", "P"]],
  [37, ["l", "L"], ["l", "L"], ["l", "L"]],
  [38, ["j", "J"], ["j", "J"], ["j", "J"]],
  [39, ["'", '"'], ["§", "!"], ["§", "!"]],
  [40, ["k", "K"], ["k", "K"], ["k", "K"]],
  [41, [";", ":"], ["ô", '"'], ["ô", '"']],
  [42, ["\\", "|"], ["ň", ")"], ["ň", ")"]],
  [43, [",", "<"], [",", "?"], [",", "?"]],
  [44, ["/", "?"], ["-", "_"], ["-", "_"]],
  [45, ["n", "N"], ["n", "N"], ["n", "N"]],
  [46, ["m", "M"], ["m", "M"], ["m", "M"]],
  [47, [".", ">"], [".", ":"], [".", ":"]],
  [50, ["`", "~"], ["\\", "|"], ["\\", "|"]],
];

const LAYOUT_COLUMN: Record<LayoutId, 1 | 2 | 3> = { en: 1, "sk-qwerty": 2, "sk-qwertz": 3 };

/** Slovak dead keys. Compositions are keyed by the character the following key produces. */
interface DeadKey {
  accent: string;
  compose: Record<string, string>;
}

const ACUTE: DeadKey = {
  accent: "´",
  compose: pairs("aá eé rŕ yý sś oó uú ií lĺ nń zź cć gģ"),
};

const CARON: DeadKey = {
  accent: "ˇ",
  compose: pairs("eě rř tť sš dď oô uů lľ nň zž cč"),
};

/** Dead keys (key code 24) are the same in both Slovak layouts. */
const SLOVAK_DEAD_KEYS: Record<string, DeadKey> = { "24:0": ACUTE, "24:1": CARON };

function pairs(spec: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [base, composed] of spec.split(" ")) {
    map[base] = composed;
    map[base.toUpperCase()] = composed.toUpperCase();
  }
  return map;
}

interface Stroke {
  code: number;
  shift: boolean;
}

/** A keystroke or a character the layout cannot produce (kept as-is). */
type Token = Stroke | { literal: string };

interface Layout {
  output(stroke: Stroke): string | null;
  dead(stroke: Stroke): DeadKey | undefined;
  /** Keystrokes that type the given character on this layout. */
  strokes(char: string): Stroke[] | undefined;
}

const layoutCache = new Map<LayoutId, Layout>();

function getLayout(id: LayoutId): Layout {
  const cached = layoutCache.get(id);
  if (cached) return cached;

  const column = LAYOUT_COLUMN[id];
  const deadKeys = id === "en" ? {} : SLOVAK_DEAD_KEYS;
  const outputs = new Map<string, string | null>();
  const reverse = new Map<string, Stroke[]>();

  for (const row of KEYS) {
    const code = row[0];
    const out = row[column];
    out.forEach((char, i) => {
      const shift = i === 1;
      outputs.set(`${code}:${i}`, char);
      if (char !== null && !reverse.has(char)) reverse.set(char, [{ code, shift }]);
    });
  }

  // Characters reachable only through a dead key, e.g. "ď" = ˇ + d.
  for (const [key, dead] of Object.entries(deadKeys)) {
    const [code, shift] = key.split(":");
    const deadStroke: Stroke = { code: Number(code), shift: shift === "1" };
    if (!reverse.has(dead.accent)) reverse.set(dead.accent, [deadStroke]);
    for (const [base, composed] of Object.entries(dead.compose)) {
      const baseStrokes = reverse.get(base);
      if (!reverse.has(composed) && baseStrokes?.length === 1) {
        reverse.set(composed, [deadStroke, baseStrokes[0]]);
      }
    }
  }

  const layout: Layout = {
    output: (s) => outputs.get(`${s.code}:${s.shift ? 1 : 0}`) ?? null,
    dead: (s) => deadKeys[`${s.code}:${s.shift ? 1 : 0}`],
    strokes: (char) => reverse.get(char),
  };
  layoutCache.set(id, layout);
  return layout;
}

function toTokens(text: string, layout: Layout): Token[] {
  const tokens: Token[] = [];
  for (const char of text) {
    const strokes = layout.strokes(char);
    if (strokes) tokens.push(...strokes);
    else tokens.push({ literal: char });
  }
  return tokens;
}

function fromTokens(tokens: Token[], layout: Layout): string {
  let result = "";
  let pending: DeadKey | undefined;

  const flushPending = () => {
    if (pending) result += pending.accent;
    pending = undefined;
  };

  for (const token of tokens) {
    if ("literal" in token) {
      flushPending();
      result += token.literal;
      continue;
    }

    const dead = layout.dead(token);
    if (dead) {
      if (pending) {
        // Pressing a dead key twice types the accent itself.
        result += pending.accent;
        pending = undefined;
      } else {
        pending = dead;
      }
      continue;
    }

    const char = layout.output(token) ?? "";
    if (pending) {
      const composed = pending.compose[char];
      if (composed) {
        result += composed;
        pending = undefined;
        continue;
      }
      flushPending();
    }
    result += char;
  }

  flushPending();
  return result;
}

export interface ConvertOptions {
  /** Leave words made only of digits (e.g. "2025", "10.5") untouched. */
  keepNumbers?: boolean;
}

const NUMBER_WORD = /^[+-]?\d+(?:[.,:/]\d+)*$/;

export function convert(text: string, from: LayoutId, to: LayoutId, options: ConvertOptions = {}): string {
  if (from === to) return text;
  const source = getLayout(from);
  const target = getLayout(to);

  return text
    .split(/(\s+)/)
    .map((part) => {
      if (part === "" || /^\s+$/.test(part)) return part;
      if (options.keepNumbers && NUMBER_WORD.test(part)) return part;
      return fromTokens(toTokens(part, source), target);
    })
    .join("");
}

export type Direction = "en-to-sk" | "sk-to-en";

/**
 * Guess which layout the text was typed in. Text containing characters that only
 * the Slovak layout produces (diacritics, §, ...) was typed on the Slovak keyboard;
 * everything else is treated as typed on the English keyboard.
 */
export function detectDirection(text: string, slovak: LayoutId = "sk-qwerty"): Direction {
  const en = getLayout("en");
  const sk = getLayout(slovak);
  for (const char of text) {
    if (/\s/.test(char)) continue;
    if (sk.strokes(char) && !en.strokes(char)) return "sk-to-en";
  }
  return "en-to-sk";
}

export function convertDirection(
  text: string,
  direction: Direction,
  slovak: LayoutId = "sk-qwerty",
  options: ConvertOptions = {},
): string {
  return direction === "en-to-sk" ? convert(text, "en", slovak, options) : convert(text, slovak, "en", options);
}
