import { Cache, environment, Image } from "@raycast/api";
import chroma from "chroma-js";
import { readFileSync } from "fs";
import { Light, Palette } from "../lib/types";
import { getColorFromLight, getIconPathFromLight } from "./hueResources";

// Earlier versions cached their Jimp PNGs in these namespaces.
new Cache({ namespace: "hue-scene-gradients" }).clear();
new Cache({ namespace: "hue-light-icons" }).clear();

const round = (n: number) => Math.round(n * 1e4) / 1e4;

// As in the Hue app's room cards, a dark overlay shades tiles from the top down. Its opacity at height fraction t rises
// fast and levels off; color and curve are fitted to a screenshot of the app.
const SHADE_COLOR = "#242424";
const shade = (t: number) => 0.78 * (1 - (1 - t) ** 3.25);

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
function gradientContent(colors: Palette, width: number, height: number) {
  const rect = (gradientId: string) => `<rect width="${width}" height="${height}" fill="url(#${gradientId})"/>`;
  const last = colors.length - 1;
  const color = (t: number) => `stop-color="${colors[Math.round(t * last)]}"`;
  const horizontal = linearGradient("h", 1, 0, Math.max(last, 1), color);
  const vertical = linearGradient("v", 0, 1, 8, (t) => `stop-color="${SHADE_COLOR}" stop-opacity="${round(shade(t))}"`);
  return `<defs>${horizontal}${vertical}</defs>${rect("h")}${rect("v")}`;
}

// Matches a 16:9 grid item with Raycast's default 5 columns, as in Control Groups and Set Scene.
const GRADIENT_WIDTH = 271;
const GRADIENT_HEIGHT = 153;

export function createGradientUri(colors: Palette): string | undefined {
  if (colors.length === 0) return undefined;
  return svgUri(GRADIENT_WIDTH, GRADIENT_HEIGHT, gradientContent(colors, GRADIENT_WIDTH, GRADIENT_HEIGHT), true);
}

// Assets don't change while a command runs, so each file is read once.
const pngFiles = new Map<string, Buffer>();

function pngImage(path: string, x: number, y: number) {
  const png = pngFiles.get(path) ?? readFileSync(path);
  pngFiles.set(path, png);
  // Width and height are the first two fields of a PNG's IHDR chunk.
  const size = `width="${png.readUInt32BE(16)}" height="${png.readUInt32BE(20)}"`;
  return `<image xlink:href="data:image/png;base64,${png.toString("base64")}" x="${x}" y="${y}" ${size}/>`;
}

// Matches an 8-column grid item and light-off.png.
const LIGHT_ICON_SIZE = 162;

const GLYPH_OFFSET = 24;

export function createLightIcon(light: Light): Image {
  const iconUri = (content: string) => svgUri(LIGHT_ICON_SIZE, LIGHT_ICON_SIZE, content);
  // Raycast renders masks and filters at a lower resolution, so black glyphs come from black copies in icons-black.
  const glyph = (color: "black" | "white") => pngImage(getIconPathFromLight(light, color), GLYPH_OFFSET, GLYPH_OFFSET);

  if (!light.on.on) {
    const tile = (file: string) => pngImage(`${environment.assetsPath}/${file}`, 0, 0);
    return {
      source: {
        light: iconUri(tile("light-off.png") + glyph("black")),
        dark: iconUri(tile("light-off@dark.png") + glyph("white")),
      },
    };
  }

  // The glyph sits in the icon's top left quarter, whose center is a quarter of the way down the gradient.
  // APCA, unlike WCAG 2's contrast ratio, rates white higher than black on saturated reds and purples.
  const lightColor = getColorFromLight(light);
  const behindGlyph = chroma.mix(lightColor, SHADE_COLOR, shade(0.25), "rgb");
  const black = Math.abs(chroma.contrastAPCA("#000", behindGlyph)) > Math.abs(chroma.contrastAPCA("#fff", behindGlyph));
  const background = gradientContent([lightColor], LIGHT_ICON_SIZE, LIGHT_ICON_SIZE);
  return { source: iconUri(background + glyph(black ? "black" : "white")) };
}
