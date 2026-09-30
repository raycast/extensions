// Unicode "styled text": letters from the Mathematical Alphanumeric Symbols block, and combining
// marks for strike and underline. Useful where there is no formatting (LinkedIn, Slack titles,
// commit messages), but screen readers and search handle them badly, so use them sparingly.

export type TextStyle = "bold" | "italic" | "boldItalic" | "mono" | "strike" | "underline";

// First code point of A, a and 0 in each alphabet; undefined when the block has no digits.
const ALPHABETS: Record<"bold" | "italic" | "boldItalic" | "mono", [number, number, number | undefined]> = {
  bold: [0x1d5d4, 0x1d5ee, 0x1d7ec], // sans-serif bold
  italic: [0x1d608, 0x1d622, undefined], // sans-serif italic
  boldItalic: [0x1d63c, 0x1d656, 0x1d7ec], // sans-serif bold italic, bold digits
  mono: [0x1d670, 0x1d68a, 0x1d7f6],
};

export const STYLE_CAVEAT =
  "Screen readers read these as math symbols or skip them, and search won't find the words. Use them for a word or two, not whole sentences.";

export function styleText(input: string, style: TextStyle): string {
  if (style === "strike" || style === "underline") {
    const mark = style === "strike" ? "̶" : "̲";
    return [...input].map((ch) => (/\s/.test(ch) ? ch : ch + mark)).join("");
  }
  const [upper, lower, digit] = ALPHABETS[style];
  return [...input]
    .map((ch) => {
      const c = ch.codePointAt(0)!;
      if (c >= 65 && c <= 90) return String.fromCodePoint(upper + c - 65);
      if (c >= 97 && c <= 122) return String.fromCodePoint(lower + c - 97);
      if (c >= 48 && c <= 57 && digit !== undefined) return String.fromCodePoint(digit + c - 48);
      return ch;
    })
    .join("");
}
