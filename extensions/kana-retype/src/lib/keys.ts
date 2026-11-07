// JIS keyboard "Kana" key code
export const KANA_KEY_CODE = 104;

// Standard printable ASCII characters (excluding spaces which trigger IME conversion, and control chars)
const TYPABLE = /^[\x21-\x7E]$/;

/** Checks if text contains whitespace (spaces, tabs, or newlines) */
export function checkWhitespace(text: string): { hasNewlinesOrTabs: boolean; hasSpaces: boolean } {
  return {
    hasNewlinesOrTabs: /[\r\n\t]/.test(text),
    hasSpaces: / /.test(text),
  };
}

/** Returns non-typable characters (full-width, kana, kanji, control chars) without duplicates */
export function findUntypableChars(text: string): string[] {
  const chars = Array.from(text).filter((char) => !TYPABLE.test(char));
  return [...new Set(chars)];
}

/**
 * Fixed AppleScript template that receives user input via argv to prevent script injection.
 * Sends the Kana key (key code 104) and keystrokes the input text.
 */
export const RETYPE_SCRIPT = `
on run argv
  set inputText to item 1 of argv
  tell application "System Events"
    key code 104
    delay 0.1
    keystroke inputText
  end tell
end run
`;
