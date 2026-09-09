import figlet from "figlet";
import standard from "figlet/importable-fonts/Standard.js";
import small from "figlet/importable-fonts/Small.js";
import slant from "figlet/importable-fonts/Slant.js";
import big from "figlet/importable-fonts/Big.js";

const ALPHABET_COLORS = ["yellow", "white"] as const;
const EXPANDED_SPACE = "   ";
export const ASCII_FONTS = ["Small", "Standard", "Slant", "Big"] as const;
export const DEFAULT_FONT = "Small";
export const TEXT_COLUMNS = 60;

figlet.parseFont("Standard", standard);
figlet.parseFont("Small", small);
figlet.parseFont("Slant", slant);
figlet.parseFont("Big", big);

export function transformText(text: string, variant: string = "alphabet", font: string = DEFAULT_FONT): string {
  switch (variant) {
    case "alphabet":
      return text.replace(/[a-z ]/gi, (character, index: number) =>
        character === " "
          ? EXPANDED_SPACE
          : `:alphabet-${ALPHABET_COLORS[index % ALPHABET_COLORS.length]}-${character}:`,
      );
    case "ascii": {
      if (/[^\x20-\x7e\n\r]/.test(text)) {
        throw new Error(
          "ASCII banners support English letters, numbers, and punctuation. Use Alphabet Emoji for other scripts.",
        );
      }
      const selectedFont = ASCII_FONTS.find((value) => value === font);
      if (!selectedFont) throw new Error("Choose a supported ASCII font.");
      const lines = figlet
        .textSync(text, {
          font: selectedFont,
          horizontalLayout: "default",
          width: TEXT_COLUMNS,
          whitespaceBreak: true,
        })
        .split("\n")
        .map((line) => line.trimEnd());
      while (lines.length && !lines[0].trim()) lines.shift();
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      return lines.join("\n");
    }
    default:
      throw new Error("Unknown style. Choose a style from the dropdown.");
  }
}
