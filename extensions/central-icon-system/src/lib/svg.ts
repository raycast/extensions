/**
 * SVG string manipulation for previews and export.
 *
 * Pure and dependency-free so it stays out of the WASM import graph and can be
 * unit-tested without a Raycast environment.
 */

import type { Fill } from "../types";

/** Preview backdrop options for the grid. `none` leaves the SVG untouched. */
export const BACKDROPS = {
  none: { title: "None", color: null },
  white: { title: "White", color: "#FFFFFF" },
  black: { title: "Black", color: "#000000" },
  gray: { title: "50% Gray", color: "#808080" },
} as const;

export type Backdrop = keyof typeof BACKDROPS;

export const DEFAULT_BACKDROP: Backdrop = "none";

export function isBackdrop(value: string | undefined): value is Backdrop {
  return value !== undefined && value in BACKDROPS;
}

/** Central icons are drawn on a 24×24 canvas. */
const VIEWBOX = 24;

/**
 * Canvas size when a backdrop is active, as a multiple of the 24-unit viewBox.
 *
 * **Why the grid drops its inset for backdropped tiles.** `Grid.Inset` insets an
 * item's *content*, so with it on, the SVG — backdrop rect included — is drawn
 * inside a smaller box and the fill can never reach the tile edges. It has to be
 * off for a backdrop to read as a tile rather than a floating square.
 *
 * With inset off the canvas maps to the whole tile, so the glyph would jump to
 * full-bleed. Expanding the canvas and centring the 24-unit glyph inside it
 * restores the original proportion.
 *
 * Measured from the rendered grid rather than guessed: at `Grid.Inset.Large` a
 * glyph occupies ~56px of a ~148px tile, i.e. **37.8%**. For a 24-unit glyph to
 * hold that fraction of a full-tile canvas, the canvas must be 24 / 0.378 ≈ 63.4
 * units — **2.64×**.
 *
 * Two earlier attempts failed because they tried to do this with the inset left
 * on: growing the canvas then shrinks the glyph by exactly the factor that was
 * meant to enlarge the backdrop, so the two goals cancel.
 */
const BACKDROP_CANVAS = 2.64;

/** The ink color that reads against each backdrop. */
const BACKDROP_INK: Record<Backdrop, string | null> = {
  none: null, // no backdrop → Raycast's tintColor handles theming
  white: "#000000",
  black: "#FFFFFF",
  gray: "#FFFFFF",
};

/**
 * Fill the whole preview tile with a backdrop color, for grid preview only.
 *
 * Two things have to happen together, and missing either one looks broken:
 *
 * 1. **Resolve `currentColor` to an ink that contrasts with the backdrop.**
 *    Raycast's `tintColor` cannot be used here — it would recolor the backdrop
 *    rect too — so the grid passes `tintColor: null` when a backdrop is active
 *    and the ink is baked in instead. Leave `currentColor` unresolved and a
 *    black backdrop renders black-on-black.
 * 2. **Grow the canvas; never scale the glyph.** The glyph stays at its native
 *    24 units and the canvas expands around it, so the rect reaches the tile
 *    edges while the glyph holds the same proportion of the tile it has in
 *    default mode. The grid pairs this with `inset={undefined}` — see
 *    {@link BACKDROP_CANVAS} for why both halves are required.
 *
 * Returns the SVG unchanged for `none`.
 *
 * **Preview-only styling** — exported PNGs and copied SVGs keep a fully
 * transparent background and never receive a backdrop.
 */
export function withBackdrop(svg: string, backdrop: Backdrop): string {
  const color = BACKDROPS[backdrop].color;
  if (!color) return svg;

  const openTag = svg.match(/<svg[^>]*>/)?.[0];
  if (!openTag) return svg;

  const ink = BACKDROP_INK[backdrop];
  const body = ink ? withColor(svg, ink) : svg;
  const inner = body.slice(openTag.length).replace(/<\/svg>\s*$/, "");

  // Expand the canvas around the glyph and re-declare the viewBox to match, so
  // the rect can reach the tile edges while the glyph keeps its native size.
  const canvas = VIEWBOX * BACKDROP_CANVAS;
  const offset = (canvas - VIEWBOX) / 2;

  const tag =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" ` +
    `viewBox="0 0 ${canvas} ${canvas}" fill="none">`;
  const rect = `<rect x="0" y="0" width="${canvas}" height="${canvas}" fill="${color}"/>`;
  const artwork = `<g transform="translate(${offset},${offset})">${inner}</g>`;
  return `${tag}${rect}${artwork}</svg>`;
}

/**
 * Replace `currentColor` with an explicit color.
 *
 * Central icons emit `currentColor` throughout, which Raycast's `tintColor`
 * handles for previews. But a rasterizer has no inherited color to resolve it
 * against — an unsubstituted `currentColor` renders black on a transparent
 * background, which is invisible against a dark backdrop. Export paths must
 * substitute before rendering.
 */
export function withColor(svg: string, color: string): string {
  return svg.replace(/currentColor/g, color);
}

/**
 * Strip `width`/`height` from the **root `<svg>` tag only**, leaving sized
 * child elements untouched.
 *
 * Central icons carry `width="24" height="24"`. With those present, resvg
 * renders at 24px and scales the raster up, so a 512px export is a blurry
 * upscale rather than vector art. Removing them makes resvg render from the
 * `viewBox` at whatever size is requested.
 */
export function stripRootDimensions(svg: string): string {
  return svg.replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(?:width|height)="[^"]*"/g, ""));
}

/**
 * Build a data URI for inline SVG preview in a Grid.
 *
 * The SVG **must** be URL-encoded: a raw `#` (from a hex color, e.g. a backdrop
 * `fill="#FFFFFF"`) starts a URL fragment and silently truncates the markup, so
 * the tile renders blank. `encodeURIComponent` escapes `#`, `<`, `>` and quotes.
 */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The React component tag for an icon, e.g. `<IconHome />`. */
export function jsxFor(name: string): string {
  return `<${name} />`;
}

/** The import statement for an icon in a given style. */
export function importFor(name: string, style: string): string {
  return `import { ${name} } from '@central-icons-react/${style}/${name}';`;
}

/** Human-readable label for a fill, used in tile subtitles and menus. */
export function fillLabel(fill: Fill): string {
  return fill === "filled" ? "Filled" : "Outlined";
}
