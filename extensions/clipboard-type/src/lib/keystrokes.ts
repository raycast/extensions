import { keyCodes, returnKeyCode, shiftedKeyCodes, tabKeyCode } from "./keymap";

/** A physical key press, or text to send through System Events when there's no key mapping. */
export type Keystroke = { keyCode: number; shift: boolean } | { text: string };

export interface KeystrokeOptions {
  /** Type newlines as Shift+Return instead of Return. */
  softNewlines: boolean;
}

/** Converts CRLF and lone CR to LF so Windows line endings produce one newline, not two. */
export function normalizeNewlines(text: string) {
  return text.replace(/\r\n?/g, "\n");
}

/** Plans one keystroke per character, so progress can be reported as keystrokes remaining. */
export function planKeystrokes(text: string, { softNewlines }: KeystrokeOptions): Keystroke[] {
  return Array.from(text).map((character): Keystroke => {
    if (character === "\n") return { keyCode: returnKeyCode, shift: softNewlines };
    if (character === "\t") return { keyCode: tabKeyCode, shift: false };
    if (Object.hasOwn(shiftedKeyCodes, character)) return { keyCode: shiftedKeyCodes[character], shift: true };
    if (Object.hasOwn(keyCodes, character)) return { keyCode: keyCodes[character], shift: false };
    return { text: character };
  });
}
