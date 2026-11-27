import { environment, type Image } from "@raycast/api";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { createPngCache } from "./png-cache";
import { GLYPH_CATALOG, type GlyphDefinition } from "./glyph-catalog";
import {
  maskFromRgba,
  paintPills,
  type BadgeImage,
  type GlyphMask,
  type PaintIndicator,
  type PillSpec,
} from "./pill-painter";

/** Bump when the drawing changes so cached files are regenerated. */
const CACHE_VERSION = "v5";
const CANVAS = 160;

/** Program states Rex stamps on a pill; the files in assets/status carry these names. */
export type BadgeState = "working" | "blocked" | "done" | "error";

/** Activity shown on a pill; see docs/indicators-plan.md. */
export type PillIndicator =
  | { kind: "dot"; color: string }
  | { kind: "badge"; state: BadgeState }
  | { kind: "pie"; progress: number }
  | { kind: "dots"; frame: number }
  | { kind: "spinner"; frame: number };

export const DOTS_FRAMES = 3;
export const SPINNER_FRAMES = 8;

const definitions = new Map<string, GlyphDefinition>(GLYPH_CATALOG.map((d) => [d.glyph, d]));
const masks = new Map<string, GlyphMask | null>();
const badges = new Map<string, BadgeImage | null>();
const cachedPng = createPngCache(environment.supportPath);

function readPng(path: string): PNG | undefined {
  try {
    return existsSync(path) ? PNG.sync.read(readFileSync(path)) : undefined;
  } catch {
    return undefined;
  }
}

function loadMask(name: string): GlyphMask | undefined {
  if (masks.has(name)) return masks.get(name) ?? undefined;
  const png = readPng(join(environment.assetsPath, "glyphs", `${name}.png`));
  const mask = png
    ? maskFromRgba(png.width, png.height, new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.length))
    : null;
  masks.set(name, mask);
  return mask ?? undefined;
}

function loadBadge(state: BadgeState, appearance: "light" | "dark"): BadgeImage | undefined {
  const key = `${state}-${appearance}`;
  if (badges.has(key)) return badges.get(key) ?? undefined;
  const png = readPng(join(environment.assetsPath, "status", `${state}${appearance === "dark" ? "@dark" : ""}.png`));
  const badge = png
    ? {
        width: png.width,
        height: png.height,
        rgba: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.length),
      }
    : null;
  badges.set(key, badge);
  return badge ?? undefined;
}

function spec(glyph: string): PillSpec | undefined {
  const definition = definitions.get(glyph);
  if (!definition) return undefined;
  return {
    definition,
    mask: loadMask(glyph),
    silhouette: definition.glyphBackground ? loadMask(`block-silhouette-${glyph}`) : undefined,
  };
}

/** Cache-key fragment for an indicator; frames and progress are normalised so keys stay few. */
function indicatorKey(indicator: PillIndicator | undefined, appearance: "light" | "dark"): string {
  if (!indicator) return "";
  switch (indicator.kind) {
    case "dot":
      return `-dot-${indicator.color.replace("#", "").toLowerCase()}`;
    case "badge":
      return `-badge-${indicator.state}-${appearance}`;
    case "pie":
      return `-pie-${Math.round(Math.max(0, Math.min(100, indicator.progress)) / 5) * 5}`;
    case "dots":
      return `-dots-${((indicator.frame % DOTS_FRAMES) + DOTS_FRAMES) % DOTS_FRAMES}`;
    case "spinner":
      return `-spinner-${((indicator.frame % SPINNER_FRAMES) + SPINNER_FRAMES) % SPINNER_FRAMES}`;
  }
}

function toPaintIndicator(
  indicator: PillIndicator | undefined,
  appearance: "light" | "dark",
): PaintIndicator | undefined {
  if (!indicator) return undefined;
  switch (indicator.kind) {
    case "badge": {
      const image = loadBadge(indicator.state, appearance);
      return image ? { kind: "badge", image } : undefined;
    }
    case "pie":
      return { kind: "pie", progress: Math.round(Math.max(0, Math.min(100, indicator.progress)) / 5) * 5 };
    case "dots":
      return { kind: "dots", frame: ((indicator.frame % DOTS_FRAMES) + DOTS_FRAMES) % DOTS_FRAMES };
    case "spinner":
      return { kind: "spinner", frame: ((indicator.frame % SPINNER_FRAMES) + SPINNER_FRAMES) % SPINNER_FRAMES };
    default:
      return indicator;
  }
}

function paint(
  specs: PillSpec[],
  layout: "tab" | "pane",
  indicator: PillIndicator | undefined,
  appearance: "light" | "dark",
): string | undefined {
  const key = `${layout}-${specs.map((s) => s.definition.glyph).join("+")}${indicatorKey(indicator, appearance)}`;
  return cachedPng(`pills/${CACHE_VERSION}`, key, () =>
    paintPills(specs, { size: CANVAS, layout, indicator: toPaintIndicator(indicator, appearance) }),
  );
}

/**
 * Image for the given pills (front first), painting it on first use. A badge uses Rex's status
 * art, which has light and dark variants, so both are painted and Raycast picks by theme; every
 * other indicator is drawn in colours that work on both, so one file serves both themes.
 * Returns undefined when none of the glyphs is in Rex's catalog.
 */
export function pillImage(
  glyphs: string[],
  layout: "tab" | "pane",
  indicator?: PillIndicator,
): Image.ImageLike | undefined {
  const specs = glyphs.map(spec).filter((s): s is PillSpec => s !== undefined);
  if (specs.length === 0) return undefined;
  if (indicator?.kind === "badge") {
    const light = paint(specs, layout, indicator, "light");
    const dark = paint(specs, layout, indicator, "dark");
    return light && dark ? { source: { light, dark } } : undefined;
  }
  const source = paint(specs, layout, indicator, "light");
  return source ? { source } : undefined;
}
