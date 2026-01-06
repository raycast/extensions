import { Clipboard, showHUD, LaunchProps } from "@raycast/api";

interface Arguments {
  text: string;
}

// Mathematical Monospace Unicode ranges
const UPPERCASE_START = 0x1d670; // 𝙰
const LOWERCASE_START = 0x1d68a; // 𝚊
const DIGIT_START = 0x1d7f6; // 𝟶

// Fullwidth Forms start at U+FF01 for '!' (ASCII 0x21)
const FULLWIDTH_START = 0xff01;
const ASCII_SYMBOL_START = 0x21; // '!'

function toMonospace(text: string): string {
  let result = "";

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (code >= 65 && code <= 90) {
      // Uppercase A-Z
      result += String.fromCodePoint(UPPERCASE_START + (code - 65));
    } else if (code >= 97 && code <= 122) {
      // Lowercase a-z
      result += String.fromCodePoint(LOWERCASE_START + (code - 97));
    } else if (code >= 48 && code <= 57) {
      // Digits 0-9
      result += String.fromCodePoint(DIGIT_START + (code - 48));
    } else if (code >= 33 && code <= 126 && code !== 32) {
      // ASCII symbols and punctuation (except space)
      // Map to fullwidth equivalents (U+FF01 to U+FF5E)
      result += String.fromCodePoint(
        FULLWIDTH_START + (code - ASCII_SYMBOL_START),
      );
    } else {
      // Space and other characters pass through unchanged
      result += char;
    }
  }

  return result;
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { text } = props.arguments;

  if (!text.trim()) {
    await showHUD("No text provided");
    return;
  }

  const monospaced = toMonospace(text);
  await Clipboard.copy(monospaced);
  await showHUD("Copied to clipboard!");
}
