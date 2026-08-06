import { Keyboard } from "@raycast/api";

const KEY_DISPLAY_MAP: Record<string, string> = {
  minus: "-",
  equal: "=",
  period: ".",
  comma: ",",
  slash: "/",
  backslash: "\\",
  quote: "'",
  semicolon: ";",
  backtick: "`",
  leftSquareBracket: "[",
  rightSquareBracket: "]",
  space: "space",
  enter: "enter",
  esc: "escape",
  backspace: "backspace",
  tab: "tab",
  left: "arrowLeft",
  down: "arrowDown",
  up: "arrowUp",
  right: "arrowRight",
  alt: "opt",
};

export function normalizeKey(key: string): string {
  return KEY_DISPLAY_MAP[key] || key;
}

export function parseShortcutKey(shortcutKey: string): {
  modifiers: Keyboard.KeyModifier[];
  key: Keyboard.KeyEquivalent;
} | null {
  const parts = shortcutKey.split("-");
  const keyPart = normalizeKey(parts[parts.length - 1]);
  const modifiers = parts.slice(0, -1).map((m) => normalizeKey(m)) as Keyboard.KeyModifier[];

  if (keyPart === "escape") return null;

  return {
    modifiers,
    key: keyPart as Keyboard.KeyEquivalent,
  };
}

const KEY_CODE_MAP: Record<string, number> = {
  a: 0,
  s: 1,
  d: 2,
  f: 3,
  h: 4,
  g: 5,
  z: 6,
  x: 7,
  c: 8,
  v: 9,
  b: 11,
  q: 12,
  w: 13,
  e: 14,
  r: 15,
  y: 16,
  t: 17,
  "1": 18,
  "2": 19,
  "3": 20,
  "4": 21,
  "6": 22,
  "5": 23,
  "9": 25,
  "7": 26,
  "8": 28,
  "0": 29,
  o: 31,
  u: 32,
  i: 34,
  p: 35,
  l: 37,
  j: 38,
  k: 40,
  n: 45,
  m: 46,
  equal: 24,
  minus: 27,
  right_bracket: 30,
  left_bracket: 33,
  quote: 39,
  semicolon: 41,
  backslash: 42,
  comma: 43,
  slash: 44,
  period: 47,
  tab: 48,
  space: 49,
  grave: 50,
  delete: 51,
  escape: 53,
  left_arrow: 123,
  right_arrow: 124,
  down_arrow: 125,
  up_arrow: 126,
};

export function mapKeyToKeyCode(key: string): number | null {
  return KEY_CODE_MAP[key.toLowerCase()] ?? null;
}
