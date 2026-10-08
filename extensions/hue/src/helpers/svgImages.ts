import { Cache, environment, Image } from "@raycast/api";
import chroma from "chroma-js";
import { readFileSync } from "fs";
import { Group, GroupedLight, Light, Palette } from "../lib/types";
import { getColorFromLight, getIconPathFromGroup, getIconPathFromLight } from "./hueResources";

// Earlier versions cached their Jimp PNGs in these namespaces.
new Cache({ namespace: "hue-scene-gradients" }).clear();
new Cache({ namespace: "hue-light-icons" }).clear();

const round = (n: number) => Math.round(n * 1e4) / 1e4;

// As in the Hue app's room cards, a near-black overlay shades tiles from the top down, more as brightness drops. Its
// opacity at height fraction t blends a curve that rises fast and levels off, at the lowest brightness, with one that
// starts slow, at full brightness. Both are fitted to screenshots of the app at 1, 25, 50, 75 and 100% brightness.
const SHADE_COLOR = "#00040f";
function shade(t: number, brightness: number) {
  const dim = 0.61 * (1 - (1 - t) ** 3.25) + 0.08;
  const full = 0.42 * t ** 1.7 + 0.02;
  return dim + ((full - dim) * brightness) / 100;
}

function svgUri(width: number, height: number, content: string, stretch = false) {
  const aspect = stretch ? ' preserveAspectRatio="none"' : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"${aspect}>${content}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function linearGradient(id: string, x2: number, y2: number, steps: number, stop: (t: number) => string) {
  const stops = Array.from({ length: steps + 1 }, (_, i) => `<stop offset="${round(i / steps)}" ${stop(i / steps)}/>`);
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.join("")}</linearGradient>`;
}

// The colors blend evenly from left to right, edge to edge.
function gradientContent(colors: Palette, brightness: number, width: number, height: number) {
  const rect = (gradientId: string) => `<rect width="${width}" height="${height}" fill="url(#${gradientId})"/>`;
  const last = colors.length - 1;
  const color = (t: number) => `stop-color="${colors[Math.round(t * last)]}"`;
  const horizontal = linearGradient("h", 1, 0, Math.max(last, 1), color);
  const vertical = linearGradient(
    "v",
    0,
    1,
    8,
    (t) => `stop-color="${SHADE_COLOR}" stop-opacity="${round(shade(t, brightness))}"`,
  );
  return `<defs>${horizontal}${vertical}</defs>${rect("h")}${rect("v")}`;
}

// Matches a 16:9 grid item with Raycast's default 5 columns, as in Control Groups and Set Scene.
const GRADIENT_WIDTH = 271;
const GRADIENT_HEIGHT = 153;

export function createGradientUri(colors: Palette, brightness: number): string | undefined {
  if (colors.length === 0) return undefined;
  const content = gradientContent(colors, brightness, GRADIENT_WIDTH, GRADIENT_HEIGHT);
  return svgUri(GRADIENT_WIDTH, GRADIENT_HEIGHT, content, true);
}

// Assets don't change while a command runs, so each file is read once.
const pngFiles = new Map<string, Buffer>();

// Draws the PNG at its own size unless given one.
function pngImage(path: string, x: number, y: number, size?: { width: number; height: number }) {
  const png = pngFiles.get(path) ?? readFileSync(path);
  pngFiles.set(path, png);
  // Width and height are the first two fields of a PNG's IHDR chunk.
  const { width, height } = size ?? { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  return `<image xlink:href="data:image/png;base64,${png.toString("base64")}" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
}

type Glyph = (color: "black" | "white") => string;

const GLYPH_OFFSET = 24;

// Raycast renders masks and filters at a lower resolution, so black glyphs come from black copies in icons-black.
const glyphImage =
  (path: (color: "black" | "white") => string): Glyph =>
  (color) =>
    pngImage(path(color), GLYPH_OFFSET, GLYPH_OFFSET);

// The glyph sits in the icon's top left quarter, so it is black or white, whichever stands out more at that quarter's
// center. APCA, unlike WCAG 2's contrast ratio, rates white higher than black on saturated reds and purples.
function onIcon(width: number, height: number, colors: Palette, brightness: number, glyph: Glyph): Image {
  const behindGlyph = chroma.mix(chroma.scale(colors)(0.25), SHADE_COLOR, shade(0.25, brightness), "rgb");
  const black = Math.abs(chroma.contrastAPCA("#000", behindGlyph)) > Math.abs(chroma.contrastAPCA("#fff", behindGlyph));
  return {
    source: svgUri(
      width,
      height,
      gradientContent(colors, brightness, width, height) + glyph(black ? "black" : "white"),
    ),
  };
}

// The off tiles are light in the light theme and dark in the dark theme, so their glyphs are black and white.
function offIcon(width: number, height: number, tile: string, glyph: Glyph): Image {
  const iconUri = (file: string, color: "black" | "white") =>
    svgUri(width, height, pngImage(`${environment.assetsPath}/${file}`, 0, 0, { width, height }) + glyph(color));
  return { source: { light: iconUri(`${tile}.png`, "black"), dark: iconUri(`${tile}@dark.png`, "white") } };
}

// Matches an 8-column grid item and light-off.png.
const LIGHT_ICON_SIZE = 162;

export function createLightIcon(light: Light): Image {
  const glyph = glyphImage((color) => getIconPathFromLight(light, color));
  return light.on.on
    ? onIcon(LIGHT_ICON_SIZE, LIGHT_ICON_SIZE, [getColorFromLight(light)], light.dimming?.brightness ?? 100, glyph)
    : offIcon(LIGHT_ICON_SIZE, LIGHT_ICON_SIZE, "light-off", glyph);
}

export function createGroupIcon(group: Group, colors: Palette, groupedLight: GroupedLight | undefined): Image {
  const glyph = glyphImage((color) => getIconPathFromGroup(group, color));
  return groupedLight?.on?.on && colors.length > 0
    ? onIcon(GRADIENT_WIDTH, GRADIENT_HEIGHT, colors, groupedLight.dimming?.brightness ?? 100, glyph)
    : offIcon(GRADIENT_WIDTH, GRADIENT_HEIGHT, "group-off", glyph);
}
