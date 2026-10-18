import { create } from "fontkit";
import type { TextMeasurer } from "pele";

// Portable families from pele.run's sans-serif and monospace font stacks.
export const FONT_FAMILY = "Inter";
export const MONO_FONT_FAMILY = "IBM Plex Mono";
export const FONT_SIZE = 16;
export const FONT_FILES = [
  "Inter-Regular.otf",
  "Inter-Bold.otf",
  "Inter-Italic.otf",
  "Inter-BoldItalic.otf",
  "IBMPlexMono-Regular.ttf",
  "IBMPlexMono-Bold.ttf",
  "IBMPlexMono-Italic.ttf",
  "IBMPlexMono-BoldItalic.ttf",
  "NotoEmoji.ttf",
];

export function createTextMeasurer(buffers: Uint8Array[]): TextMeasurer {
  const fonts = buffers.map((buffer) => {
    const font = create(Buffer.from(buffer));
    if (!("layout" in font)) throw new Error("Expected a single diagram font, not a font collection.");
    return font;
  });
  const emojiFont = fonts[8];
  if (!emojiFont) throw new Error("Missing emoji fallback font.");
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const cache = new Map<string, number>();
  return {
    width(text, size, style) {
      // Pele's style flags are bold=1, italic=2, and monospace=4.
      const font = fonts[style & 7];
      if (!font) throw new Error("Missing diagram font.");
      const key = `${style & 7}:${size}:${text}`;
      let width = cache.get(key);
      if (width === undefined) {
        // Keep emoji sequences together and ordinary text in runs to retain kerning.
        let runFont = font;
        let run = "";
        width = 0;
        for (const { segment } of segmenter.segment(text)) {
          // Joiners and variation selectors shape a cluster without drawing a glyph.
          const codePoints = Array.from(segment, (character) => character.codePointAt(0)!).filter(
            (codePoint) => codePoint !== 0x200d && codePoint !== 0xfe0e && codePoint !== 0xfe0f,
          );
          const needsFallback = codePoints.some((codePoint) => !font.hasGlyphForCodePoint(codePoint));
          const hasFallback = codePoints.every((codePoint) => emojiFont.hasGlyphForCodePoint(codePoint));
          const nextFont = needsFallback && hasFallback ? emojiFont : font;
          if (nextFont !== runFont) {
            width += (runFont.layout(run).advanceWidth * size) / runFont.unitsPerEm;
            run = "";
            runFont = nextFont;
          }
          run += segment;
        }
        width += (runFont.layout(run).advanceWidth * size) / runFont.unitsPerEm;
        if (cache.size >= 20_000) cache.clear();
        cache.set(key, width);
      }
      return width;
    },
  };
}
