import type { KeyCodes } from "./key-codes-provider";

// Windows key names for validation only (not numeric codes like macOS)
// These are the key names that can appear in shortcut data files
export function getWindowsKeyNames(): KeyCodes {
  const keys: KeyCodes = {};

  // Letters
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i); // a-z
    keys[letter] = letter;
  }

  // Numbers
  for (let i = 0; i <= 9; i++) {
    keys[i.toString()] = i.toString();
  }

  // Function keys
  for (let i = 1; i <= 24; i++) {
    keys[`f${i}`] = `f${i}`;
  }

  // Special keys
  const specialKeys = [
    "plus",
    "hyphen",
    "ctrl",
    "shift",
    "alt",
    "opt",
    "cmd",
    "win",
    "enter",
    "tab",
    "escape",
    "esc",
    "backspace",
    "delete",
    "del",
    "home",
    "end",
    "pageup",
    "pagedown",
    "pgup",
    "pgdn",
    "left",
    "right",
    "up",
    "down",
    "space",
    "insert",
    "pause",
    "scrolllock",
    "numlock",
    "capslock",
    "printscreen",
    "break",
  ];

  specialKeys.forEach((key) => {
    keys[key] = key;
  });

  // Symbols and punctuation
  const symbols = [
    "`",
    "-",
    "=",
    "[",
    "]",
    "\\",
    ";",
    "'",
    ",",
    ".",
    "/",
    "~",
    "!",
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "(",
    ")",
    "_",
    "+",
    "{",
    "}",
    "|",
    ":",
    '"',
    "<",
    ">",
    "?",
  ];

  symbols.forEach((symbol) => {
    keys[symbol] = symbol;
  });

  return keys;
}
