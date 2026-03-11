/**
 * KeyCode → display name mapping for macOS virtual key codes.
 *
 * Values match KeyboardShortcuts.Key.rawValue (which are kVK_* Carbon constants).
 * This remains a static US-ANSI fallback for cases where the local helper
 * is unavailable or doesn't return a label for a given key code.
 */

import type { KeyLabelLookup } from "./key-layout-helper";
import { ShortcutStep } from "./types";

// ── Key code → display label ────────────────────────────────────────────

const FALLBACK_KEY_MAP: Record<number, string> = {
  // Letters (ANSI layout)
  0: "A",
  1: "S",
  2: "D",
  3: "F",
  4: "H",
  5: "G",
  6: "Z",
  7: "X",
  8: "C",
  9: "V",
  11: "B",
  12: "Q",
  13: "W",
  14: "E",
  15: "R",
  16: "Y",
  17: "T",
  18: "1",
  19: "2",
  20: "3",
  21: "4",
  22: "6",
  23: "5",
  24: "=",
  25: "9",
  26: "7",
  27: "-",
  28: "8",
  29: "0",
  30: "]",
  31: "O",
  32: "U",
  33: "[",
  34: "I",
  35: "P",
  36: "⏎", // Return
  37: "L",
  38: "J",
  39: "'",
  40: "K",
  41: ";",
  42: "\\",
  43: ",",
  44: "/",
  45: "N",
  46: "M",
  47: ".",
  48: "⇥", // Tab
  49: "Space",
  50: "`",
  51: "⌫", // Delete (backspace)
  53: "Esc",

  // Arrow keys
  123: "←",
  124: "→",
  125: "↓",
  126: "↑",

  // Navigation
  115: "Home",
  116: "Page Up",
  117: "⌦", // Forward Delete
  119: "End",
  121: "Page Down",
  114: "Help",

  // Function keys
  122: "F1",
  120: "F2",
  99: "F3",
  118: "F4",
  96: "F5",
  97: "F6",
  98: "F7",
  100: "F8",
  101: "F9",
  109: "F10",
  103: "F11",
  111: "F12",
  105: "F13",
  107: "F14",
  113: "F15",
  106: "F16",
  64: "F17",
  79: "F18",
  80: "F19",
  90: "F20",

  // Numeric keypad
  65: "Keypad .",
  67: "Keypad *",
  69: "Keypad +",
  71: "Clear",
  75: "Keypad /",
  76: "Keypad ⏎",
  78: "Keypad -",
  81: "Keypad =",
  82: "Keypad 0",
  83: "Keypad 1",
  84: "Keypad 2",
  85: "Keypad 3",
  86: "Keypad 4",
  87: "Keypad 5",
  88: "Keypad 6",
  89: "Keypad 7",
  91: "Keypad 8",
  92: "Keypad 9",

  // Audio
  74: "Mute",
  72: "Volume Up",
  73: "Volume Down",

  // ISO keyboard extra key
  10: "§",
};

// ── Modifier bitmasks (NSEvent.ModifierFlags rawValues) ─────────────────

const MODIFIER_CONTROL = 262144; // 1 << 18
const MODIFIER_OPTION = 524288; // 1 << 19
const MODIFIER_SHIFT = 131072; // 1 << 17
const MODIFIER_COMMAND = 1048576; // 1 << 20

/**
 * Returns modifier symbols in canonical macOS order: ⌃ → ⌥ → ⇧ → ⌘
 */
function modifierSymbols(flags: number): string[] {
  const symbols: string[] = [];
  if (flags & MODIFIER_CONTROL) symbols.push("⌃");
  if (flags & MODIFIER_OPTION) symbols.push("⌥");
  if (flags & MODIFIER_SHIFT) symbols.push("⇧");
  if (flags & MODIFIER_COMMAND) symbols.push("⌘");
  return symbols;
}

// ── Modifier name lookups (for keywords & tooltips) ─────────────────────

const MODIFIER_NAMES: { flag: number; symbol: string; names: string[] }[] = [
  { flag: MODIFIER_CONTROL, symbol: "⌃", names: ["ctrl", "control"] },
  { flag: MODIFIER_OPTION, symbol: "⌥", names: ["opt", "option", "alt"] },
  { flag: MODIFIER_SHIFT, symbol: "⇧", names: ["shift"] },
  { flag: MODIFIER_COMMAND, symbol: "⌘", names: ["cmd", "command"] },
];

/**
 * Returns human-readable modifier names in canonical macOS order.
 */
function modifierFullNames(flags: number): string[] {
  const names: string[] = [];
  for (const m of MODIFIER_NAMES) {
    if (flags & m.flag) names.push(m.names[m.names.length - 1]); // "control", "option", "shift", "command"
  }
  return names;
}

/**
 * Returns a human-readable tooltip for a single step (e.g. "Control + D")
 */
function labelForKeyCode(keyCode: number, keyLabels?: KeyLabelLookup): string {
  return (
    keyLabels?.get(keyCode) ?? FALLBACK_KEY_MAP[keyCode] ?? `Key${keyCode}`
  );
}

export function formatStep(
  step: ShortcutStep,
  keyLabels?: KeyLabelLookup,
): string {
  const parts = modifierSymbols(step.modifierFlags);
  if (step.keyCode != null) {
    parts.push(labelForKeyCode(step.keyCode, keyLabels));
  }
  return parts.join("");
}

export function tooltipForStep(
  step: ShortcutStep,
  keyLabels?: KeyLabelLookup,
): string {
  const parts = modifierFullNames(step.modifierFlags).map(
    (n) => n.charAt(0).toUpperCase() + n.slice(1),
  );
  if (step.keyCode != null) {
    parts.push(labelForKeyCode(step.keyCode, keyLabels));
  }
  return parts.join(" + ");
}

/**
 * Returns search keywords for an array of steps.
 * Includes all modifier name variants and key names in lowercase.
 * Example: [{ keyCode: 2, modifierFlags: 262144 }] → ["ctrl", "control", "d"]
 */
export function keywordsForSteps(
  steps: ShortcutStep[],
  keyLabels?: KeyLabelLookup,
): string[] {
  const keywords = new Set<string>();
  for (const step of steps) {
    for (const m of MODIFIER_NAMES) {
      if (step.modifierFlags & m.flag) {
        for (const name of m.names) keywords.add(name);
      }
    }
    if (step.keyCode != null) {
      const keyName = labelForKeyCode(step.keyCode, keyLabels);
      keywords.add(keyName.toLowerCase());
    }
  }
  return [...keywords];
}
