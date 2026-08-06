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

/**
 * The fraction of the tile the artwork occupies when a backdrop is active.
 * Tuned to match the apparent cursor size under `Grid.Inset.Large` (the
 * no-backdrop framing) so cursors stay a uniform size across both modes.
 */
const ARTWORK_SCALE = 0.4;

/**
 * Fill the whole preview tile with the backdrop color, for grid preview only.
 *
 * Cursors use a 32×32 `viewBox`. A full-viewBox rect paints the color, and the
 * original artwork is scaled about the center to sit inside a margin. In the
 * grid this pairs with `inset={none}` so the fill reaches the tile edges (see
 * {@link backdropInset}). Returns the SVG unchanged for `none`.
 *
 * Preview-only styling — exported PNGs keep a fully transparent background and
 * never receive a backdrop.
 */
export function withBackdrop(svg: string, backdrop: Backdrop): string {
  const color = BACKDROPS[backdrop].color;
  if (!color) return svg;

  const openTag = svg.match(/<svg[^>]*>/)?.[0];
  if (!openTag) return svg;
  const inner = svg.slice(openTag.length).replace(/<\/svg>\s*$/, "");

  const rect = `<rect x="0" y="0" width="32" height="32" fill="${color}"/>`;
  const artwork = `<g transform="translate(16,16) scale(${ARTWORK_SCALE}) translate(-16,-16)">${inner}</g>`;
  return `${openTag}${rect}${artwork}</svg>`;
}

/**
 * Build a data URI for inline SVG preview in a Grid/List.
 *
 * The SVG **must** be URL-encoded: a raw `#` (from hex fill colors like
 * `#189569`) starts a URL fragment and silently truncates the SVG, so any
 * colored cursor renders blank. `encodeURIComponent` escapes `#`, `<`, `>`,
 * and quotes, which fixes the colored cursors (`money`, `beachball`, …).
 *
 * Pure and dependency-free, so it stays out of the WASM import graph.
 */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
