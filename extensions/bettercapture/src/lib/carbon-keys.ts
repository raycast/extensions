export interface CarbonShortcut {
  carbonKeyCode: number;
  carbonModifiers: number;
}

const CARBON_MODIFIERS: Record<number, string> = {
  256: "command down",
  512: "shift down",
  2048: "option down",
  4096: "control down",
};

/** Carbon virtual key code → AppleScript key code (same numeric values). */
const CARBON_KEY_CODES: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  11: 11,
  12: 12,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  17: 17,
  18: 18,
  19: 19,
  20: 20,
  21: 21,
  22: 22,
  23: 23,
  24: 24,
  25: 25,
  26: 26,
  27: 27,
  28: 28,
  29: 29,
  30: 30,
  31: 31,
  32: 32,
  33: 33,
  34: 34,
  35: 35,
  36: 36,
  37: 37,
  38: 38,
  39: 39,
  40: 40,
  41: 41,
  42: 42,
  43: 43,
  44: 44,
  45: 45,
  46: 46,
  47: 47,
  48: 48,
  49: 49,
  50: 50,
  51: 51,
  53: 53,
  96: 96,
  97: 97,
  98: 98,
  99: 99,
  100: 100,
  101: 101,
  103: 103,
  109: 109,
  111: 111,
  118: 118,
  120: 120,
  122: 122,
};

/** Letters/digits where AppleScript keystroke works with character literals. */
const CARBON_KEY_CHARACTERS: Record<number, string> = {
  0: "a",
  1: "s",
  2: "d",
  3: "f",
  4: "h",
  5: "g",
  6: "z",
  7: "x",
  8: "c",
  9: "v",
  11: "b",
  12: "q",
  13: "w",
  14: "e",
  15: "r",
  16: "y",
  17: "t",
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
  31: "o",
  32: "u",
  33: "[",
  34: "i",
  35: "p",
  37: "l",
  38: "j",
  39: "'",
  40: "k",
  41: ";",
  42: "\\",
  43: ",",
  44: "/",
  45: "n",
  46: "m",
  47: ".",
  50: "`",
};

function carbonModifiersToAppleScript(modifiers: number): string[] {
  const flags: string[] = [];
  for (const [mask, flag] of Object.entries(CARBON_MODIFIERS)) {
    if (modifiers & Number(mask)) {
      flags.push(flag);
    }
  }
  return flags;
}

export function carbonShortcutToAppleScript(shortcut: CarbonShortcut): string {
  const modifiers = carbonModifiersToAppleScript(shortcut.carbonModifiers);
  const modifierClause =
    modifiers.length > 0 ? ` using {${modifiers.join(", ")}}` : "";

  const character = CARBON_KEY_CHARACTERS[shortcut.carbonKeyCode];
  if (character !== undefined) {
    const escaped = character.replace("\\", "\\\\").replace('"', '\\"');
    return `keystroke "${escaped}"${modifierClause}`;
  }

  const keyCode = CARBON_KEY_CODES[shortcut.carbonKeyCode];
  if (keyCode === undefined) {
    throw new Error(
      "Unsupported shortcut key. Choose a letter, number, or function key in BetterCapture Settings → Shortcuts.",
    );
  }

  return `key code ${keyCode}${modifierClause}`;
}
