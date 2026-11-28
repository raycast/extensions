import fonteditor from "fonteditor-core";
import fontverter from "fontverter";
import opentype from "opentype.js";
import type { FontInfo } from "../types";
import { readFontData } from "./fontData";

const sampleLines = [
  "The quick brown fox",
  "jumps over the lazy dog",
  "0123456789 !?&@",
];

function getSampleLines(font: opentype.Font): string[] {
  const supported = sampleLines.filter((line) =>
    [...line].every((char) => font.charToGlyphIndex(char) > 0),
  );
  if (supported.length) return supported;

  // Language subsets and icon fonts may have no Latin letters.
  const characters = Object.keys(font.tables.cmap.glyphIndexMap)
    .map(Number)
    .filter(
      (code) =>
        code <= 0x10ffff &&
        code > 32 &&
        font.charToGlyphIndex(String.fromCodePoint(code)) > 0,
    )
    .slice(0, 48)
    .map((code) => String.fromCodePoint(code));
  if (!characters.length)
    throw new Error("This font contains no mapped characters to preview.");
  return [
    characters.slice(0, 16),
    characters.slice(16, 32),
    characters.slice(32),
  ]
    .filter((line) => line.length)
    .map((line) => line.join(""));
}

export async function loadFontPreview(
  face: FontInfo,
  pageUrl: string,
  signal?: AbortSignal,
) {
  const bytes = await readFontData(face, pageUrl, signal);
  const isEot =
    face.format === "eot" ||
    (face.format === "unknown" &&
      bytes.length >= 82 &&
      bytes.readUInt16LE(34) === 0x504c);
  const sfnt = isEot
    ? fonteditor.eot2ttf(Uint8Array.from(bytes).buffer)
    : Uint8Array.from(await fontverter.convert(bytes, "sfnt")).buffer;
  const font = opentype.parse(sfnt);
  const paths = getSampleLines(font).map((line, index) =>
    font.getPath(line, 0, index * 72, 48),
  );
  const boxes = paths.map((path) => path.getBoundingBox());
  const left = Math.min(...boxes.map((box) => box.x1)) - 20;
  const top = Math.min(...boxes.map((box) => box.y1)) - 20;
  const width = Math.max(...boxes.map((box) => box.x2)) - left + 20;
  const height = Math.max(...boxes.map((box) => box.y2)) - top + 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${width}" height="${height}"><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#222"/><g fill="#fafafa">${paths.map((path) => `<path d="${path.toPathData(2)}"/>`).join("")}</g></svg>`;
  return {
    image: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    family:
      font.getEnglishName("preferredFamily") ||
      font.getEnglishName("fontFamily") ||
      face.family,
    subfamily:
      font.getEnglishName("preferredSubfamily") ||
      font.getEnglishName("fontSubfamily"),
    glyphCount: font.glyphs.length,
    unitsPerEm: font.unitsPerEm,
  };
}
