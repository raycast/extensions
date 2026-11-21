import type { Keyboard } from "@raycast/api";

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
  const modifiers: Keyboard.KeyModifier[] = [];
  for (const modifier of parts.slice(0, -1)) {
    const normalized = normalizeKey(modifier);
    if (normalized !== "cmd" && normalized !== "ctrl" && normalized !== "opt" && normalized !== "shift") {
      return null;
    }
    modifiers.push(normalized);
  }

  if (!keyPart || keyPart === "escape") return null;

  return {
    modifiers,
    key: keyPart as Keyboard.KeyEquivalent,
  };
}
