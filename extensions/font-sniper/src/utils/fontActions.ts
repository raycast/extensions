import type { FontInfo } from "../types";

export function filterFontsByPreferences(
  fonts: FontInfo[],
  prefs: Preferences,
): FontInfo[] {
  return fonts.filter((font) => {
    switch (font.format) {
      case "woff2":
        return prefs.showWoff2;
      case "woff":
        return prefs.showWoff;
      case "ttf":
        return prefs.showTtf;
      case "otf":
        return prefs.showOtf;
      case "eot":
        return prefs.showEot;
      default:
        return true;
    }
  });
}

export function getFontDisplayName(font: FontInfo): string {
  const parts = [font.family];
  if (font.weight && font.weight !== "Regular") {
    parts.push(font.weight);
  }
  if (font.style) {
    parts.push(font.style.charAt(0).toUpperCase() + font.style.slice(1));
  }
  return parts.join(" ");
}

export function getFontSearchLinks(name: string) {
  const family = name.trim();
  if (!family) throw new Error("Enter a font family name.");
  return {
    googleFonts: `https://fonts.google.com/?query=${encodeURIComponent(family)}`,
    web: `https://www.google.com/search?q=${encodeURIComponent(family + " font")}`,
  };
}

export function getFaceLabel(font: FontInfo): string {
  return [
    font.family,
    font.weight || "Regular",
    font.style || "normal",
    font.format.toUpperCase(),
  ].join(" · ");
}
