import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import opentype from "opentype.js";

export type Glyph = {
  glyph: string;
  name: string;
  codepoint: string;
  glyphIndex: number;
};

export const CACHE_DIR = join(homedir(), ".cache/nerd-font-picker");
export const CACHE_FILE = join(CACHE_DIR, "glyphs.json");
export const MAX_DISPLAY = 200;

let nfFont: opentype.Font | null = null;

const findFont = (fontNameFilter = ""): string => {
  const dirs = [join(homedir(), "Library/Fonts"), "/Library/Fonts"];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir);
    for (const suffix of ["NerdFontMono-Regular.ttf", "NerdFont-Regular.ttf"]) {
      const candidates = files.filter((f) => f.endsWith(suffix));
      const match = fontNameFilter
        ? (candidates.find((f) => f.toLowerCase().includes(fontNameFilter.toLowerCase())) ?? candidates[0])
        : candidates[0];
      if (match) return join(dir, match);
    }
  }
  return "";
};

export const getFont = (fontNameFilter = ""): opentype.Font => {
  if (nfFont) return nfFont;
  const fontPath = findFont(fontNameFilter);
  if (!fontPath) throw new Error("No Nerd Font found in user or system font directories");
  nfFont = opentype.loadSync(fontPath);
  return nfFont;
};

export const buildCache = async (): Promise<Glyph[]> => {
  const font = getFont();
  const glyphs: Glyph[] = [];

  for (let i = 0; i < font.glyphs.length; i++) {
    if (i % 500 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    const g = font.glyphs.get(i);
    const code = g.unicodes.find((u) => u >= 0xe000);
    if (!code) continue;
    glyphs.push({
      glyph: String.fromCodePoint(code),
      // some glyph names contain dots (e.g. nf-dev-react.jsx) — normalize for display
      name: (g.name ?? `uni${code.toString(16).toUpperCase()}`).replace(/\./g, "-"),
      codepoint: `U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
      glyphIndex: i,
    });
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(glyphs));
  return glyphs;
};

export const readCache = (): Glyph[] => JSON.parse(readFileSync(CACHE_FILE, "utf-8"));

const buildSvgUri = (
  pathData: string,
  color: string,
  viewBox: string,
  transform: string,
  pixelSize?: number,
): string => {
  const sizeAttrs = pixelSize ? ` width="${pixelSize}" height="${pixelSize}"` : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${sizeAttrs}>` +
    `<g transform="${transform}" fill="${color}">` +
    `<path d="${pathData}"/></g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

export const glyphToDataUri = (g: Glyph, color: string): string => {
  const font = getFont();
  const fg = font.glyphs.get(g.glyphIndex);
  const ascender = font.ascender;
  const width = fg.advanceWidth || ascender;
  const pathData = fg.path.toPathData(0);
  const pad = Math.round(ascender * 0.1);
  return buildSvgUri(
    pathData,
    color,
    `${-pad} ${-pad} ${width + pad * 2} ${ascender + pad * 2}`,
    `translate(0 ${ascender}) scale(1 -1)`,
  );
};

export const glyphToDetailUri = (g: Glyph, color: string): string => {
  const font = getFont();
  const fg = font.glyphs.get(g.glyphIndex);
  const pathData = fg.path.toPathData(0);
  const bb = fg.getBoundingBox();
  const glyphW = bb.x2 - bb.x1 || 1;
  const glyphH = bb.y2 - bb.y1 || 1;
  const pad = Math.round(Math.max(glyphW, glyphH) * 0.1);
  const w = glyphW + pad * 2;
  const h = glyphH + pad * 2;
  return buildSvgUri(pathData, color, `0 0 ${w} ${h}`, `translate(${pad - bb.x1} ${pad + bb.y2}) scale(1 -1)`, 150);
};

export const search = (pool: Glyph[], query: string): Glyph[] => {
  if (!query.trim()) return pool.slice(0, MAX_DISPLAY);
  const q = query.toLowerCase();
  const results: Glyph[] = [];
  for (const g of pool) {
    if (g.name.includes(q) || g.codepoint.toLowerCase().includes(q)) {
      results.push(g);
      if (results.length === MAX_DISPLAY) break;
    }
  }
  return results;
};

export const unicodeEscape = (codepoint: string): string => {
  const hex = codepoint.slice(2).toLowerCase();
  return hex.length <= 4 ? `\\u${hex.padStart(4, "0")}` : `\\U${hex.padStart(8, "0")}`;
};
