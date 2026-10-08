import { Cache, environment, Image } from "@raycast/api";
import chroma from "chroma-js";
import { readFileSync } from "fs";
import { Light, Palette } from "../lib/types";
import { getColorFromLight, getIconPathFromLight } from "./hueResources";

// Earlier versions cached their Jimp PNGs in these namespaces.
new Cache({ namespace: "hue-scene-gradients" }).clear();
new Cache({ namespace: "hue-light-icons" }).clear();

const round = (n: number) => Math.round(n * 1e4) / 1e4;

// The amount to pass to chroma's darken() at height fraction t. It gives tiles a 3D-ish depth.
const darkening = (t: number) => 0.5 * (2.3 * t) ** 2;

function svgUri(width: number, height: number, content: string, stretch = false) {
  const aspect = stretch ? ' preserveAspectRatio="none"' : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"${aspect}>${content}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function linearGradient(id: string, x2: number, y2: number, steps: number, stop: (t: number) => string) {
  const stops = Array.from({ length: steps + 1 }, (_, i) => `<stop offset="${round(i / steps)}" ${stop(i / steps)}/>`);
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.join("")}</linearGradient>`;
}

function gradientContent(colors: Palette, width: number, height: number) {
  const rect = (gradientId: string) => `<rect width="${width}" height="${height}" fill="url(#${gradientId})"/>`;

  if (colors.length === 1) {
    const color = chroma(colors[0]);
    const vertical = linearGradient("v", 0, 1, 8, (t) => `stop-color="${color.darken(darkening(t)).hex()}"`);
    return `<defs>${vertical}</defs>${rect("v")}`;
  }

  // One black overlay can only follow the darkening of a mid-gray, so its opacity is derived from that.
  const gray = (t: number) => chroma.lab(60, 0, 0).darken(darkening(t)).rgb(false)[0];
  const opacity = (t: number) => round(1 - gray(t) / gray(0));
  const scale = chroma.scale(colors).gamma(0.8).padding(0.15);
  const horizontal = linearGradient("h", 1, 0, 32, (t) => `stop-color="${scale(t).hex()}"`);
  const vertical = linearGradient("v", 0, 1, 8, (t) => `stop-color="#000" stop-opacity="${opacity(t)}"`);
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
  const behindGlyph = chroma(lightColor).darken(darkening(0.25));
  const black = Math.abs(chroma.contrastAPCA("#000", behindGlyph)) > Math.abs(chroma.contrastAPCA("#fff", behindGlyph));
  const background = gradientContent([lightColor], LIGHT_ICON_SIZE, LIGHT_ICON_SIZE);
  return { source: iconUri(background + glyph(black ? "black" : "white")) };
}
