import { Cache, environment, Image } from "@raycast/api";
import chroma from "chroma-js";
import { existsSync, readFileSync } from "fs";
import { Group, Light, Palette } from "../lib/types";
import { getColorFromLight, GroupedLightState } from "./hueResources";

// Earlier versions cached their Jimp PNGs in these namespaces.
new Cache({ namespace: "hue-scene-gradients" }).clear();
new Cache({ namespace: "hue-light-icons" }).clear();

const round = (n: number) => Math.round(n * 1e4) / 1e4;

// As in the Hue app's room cards, a near-black overlay shades tiles from the top down, more as brightness drops. Its
// opacity at height fraction t blends a curve that rises fast and levels off, at the lowest brightness, with one that
// starts slow, at full brightness. Both are fitted to screenshots of the app at 1, 25, 50, 75 and 100% brightness.
const SHADE_COLOR = "#000310";
function shade(t: number, brightness: number) {
  const dim = 0.59 * (1 - (1 - t) ** 3) + 0.1;
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

type Glyph = (color: "black" | "white") => string;

// The Hue app's cards draw the glyph's square at 18% of their width, 9% of their width in from the top and left, measured
// on its screenshots. On a 271-wide tile that is 49 and 24; light tiles keep that size, as their units are the same.
const GLYPH_OFFSET = 24;
const GLYPH_SIZE = 49;

// Assets don't change while a command runs, so each glyph is read once.
const glyphData = new Map<string, string>();

// Glyphs are single-path SVGs in a 512-unit square, named after their archetype. They are drawn as filled paths, which
// Raycast renders sharply, unlike masks and filters.
function glyphPath(folder: "lights" | "rooms", archetype: string, fallback: string): Glyph {
  const key = `${folder}/${archetype}`;
  if (!glyphData.has(key)) {
    const file = (name: string) => `${environment.assetsPath}/glyphs/${folder}/${name}.svg`;
    const svg = readFileSync(existsSync(file(archetype)) ? file(archetype) : file(fallback), "utf8");
    glyphData.set(key, svg.match(/ d="([^"]+)"/)?.[1] ?? "");
  }
  const transform = `translate(${GLYPH_OFFSET} ${GLYPH_OFFSET}) scale(${GLYPH_SIZE / 512})`;
  return (color) =>
    `<path transform="${transform}" fill="${color === "white" ? "#fff" : "#000"}" d="${glyphData.get(key)}"/>`;
}

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

// The Hue app's off cards lay 11% white over its dark page, with white glyphs, measured from its screenshots. The tile
// stays translucent so Raycast's background shows through. Raycast's dark theme takes 8% to look the same, and the light
// theme mirrors it in black.
function offIcon(width: number, height: number, glyph: Glyph): Image {
  const tile = (color: "black" | "white") =>
    svgUri(
      width,
      height,
      `<rect width="${width}" height="${height}" ${color === "white" ? 'fill="#fff" fill-opacity="0.08"' : 'fill="#000" fill-opacity="0.11"'}/>` +
        glyph(color),
    );
  return { source: { light: tile("black"), dark: tile("white") } };
}

// Matches an 8-column grid item.
const LIGHT_ICON_SIZE = 162;

export function createLightIcon(light: Light): Image {
  const glyph = glyphPath("lights", light.metadata.archetype, "unknown_archetype");
  return light.on.on
    ? onIcon(LIGHT_ICON_SIZE, LIGHT_ICON_SIZE, [getColorFromLight(light)], light.dimming?.brightness ?? 100, glyph)
    : offIcon(LIGHT_ICON_SIZE, LIGHT_ICON_SIZE, glyph);
}

export function createGroupIcon(group: Group, colors: Palette, groupedLight: GroupedLightState | undefined): Image {
  const glyph = glyphPath("rooms", group.metadata.archetype, "other");
  return groupedLight?.on?.on && colors.length > 0
    ? onIcon(GRADIENT_WIDTH, GRADIENT_HEIGHT, colors, groupedLight.dimming?.brightness ?? 100, glyph)
    : offIcon(GRADIENT_WIDTH, GRADIENT_HEIGHT, glyph);
}
