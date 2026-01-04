/**
 * Figlet ASCII art generation utilities
 */
import figlet from "figlet/browser";
import { FONTS } from "../data/fonts";

let fontsLoaded = false;

/**
 * Load all fonts into figlet parser
 */
export function loadFonts(): void {
  if (fontsLoaded) return;
  for (const font of FONTS) {
    figlet.parseFont(font.name, font.data);
  }
  fontsLoaded = true;
}

/**
 * Generate ASCII art from text using specified font
 */
export function generateAsciiArt(text: string, font: string): string {
  loadFonts();
  try {
    return figlet.textSync(text, { font: font as figlet.Fonts });
  } catch {
    return "";
  }
}
