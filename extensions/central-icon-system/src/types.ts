/**
 * One icon's metadata (see `scripts/build-manifest.mjs`).
 *
 * Deliberately carries no `svg` — geometry is read on demand from the style's
 * blob via `readSvg`, because holding every SVG resident costs ~26 MB and
 * Raycast caps a command at 100 MB.
 */
export interface Icon {
  name: string;
  /** Null only if upstream ships an uncategorized icon; currently none do. */
  category: string | null;
  /** Search aliases from `icons-index.json`, fed straight to `Grid.Item.keywords`. */
  keywords: string[];
}

/** The four axes encoded in a style id like `round-outlined-radius-2-stroke-1.5`. */
export interface StyleAxes {
  join: Join;
  fill: Fill;
  radius: Radius;
  stroke: Stroke;
}

export interface StyleIndex {
  style: string;
  /** Upstream package version the geometry came from, for drift reporting. */
  version: string;
  axes: StyleAxes;
  totalIcons: number;
  categories: string[];
  icons: Icon[];
  /** Icon name → `[byteOffset, byteLength]` into the style's `.svg` blob. */
  offsets: Record<string, [number, number]>;
}

export type Join = "round" | "square";
export type Fill = "filled" | "outlined";
export type Radius = 0 | 1 | 2 | 3;
export type Stroke = "1" | "1.5" | "2";

export const FILLS: Fill[] = ["outlined", "filled"];
export const STROKES: Stroke[] = ["1", "1.5", "2"];

/**
 * Corner: the five real options, matching centralicons.com's own control.
 *
 * Join and radius are **not** independent axes — `square` ships at radius-0
 * only, so 2 joins × 4 radii would offer 8 combinations for 5 real styles.
 * Presenting them separately let a user select `square` + `2px`, which
 * `styleId` silently coerced to `square-radius-0` while the menu still showed
 * 2px checked. Merging them the way the site does removes that state entirely
 * rather than validating around it.
 */
export interface Corner {
  join: Join;
  radius: Radius;
}

export const CORNERS: Corner[] = [
  { join: "square", radius: 0 },
  { join: "round", radius: 0 },
  { join: "round", radius: 1 },
  { join: "round", radius: 2 },
  { join: "round", radius: 3 },
];

/** Stable key for a corner, for menu keys and equality checks. */
export function cornerKey({ join, radius }: Corner): string {
  return `${join}-${radius}`;
}

/** Site labels verbatim: "0px sharp", "0px round", "1px small", … */
export function cornerLabel({ join, radius }: Corner): string {
  if (radius === 0) return join === "square" ? "0px Sharp" : "0px Round";
  return `${radius}px ${({ 1: "Small", 2: "Medium", 3: "Large" } as const)[radius]}`;
}

/**
 * Display labels matching centralicons.com, so the extension's vocabulary
 * matches the web app a user switches between.
 */
export const FILL_LABELS: Record<Fill, string> = { outlined: "Line", filled: "Solid" };

/**
 * A style id rendered in the site's vocabulary, e.g.
 * `round-outlined-radius-2-stroke-1.5` → "Line · 2px Medium · 1.5px".
 *
 * Falls back to the raw id if it doesn't parse, so an unexpected style from a
 * future upstream release still lists rather than vanishing.
 */
export function styleLabel(style: string): string {
  const parsed = /^(round|square)-(filled|outlined)-radius-([0-3])-stroke-(1|1\.5|2)$/.exec(style);
  if (!parsed) return style;
  const [, join, fill, radius, stroke] = parsed;
  const corner = cornerLabel({ join: join as Join, radius: Number(radius) as Radius });
  return `${FILL_LABELS[fill as Fill]} · ${corner} · ${stroke}px`;
}

/** Which fills the grid shows. `all` renders outlined and filled side by side. */
export type ShowFilter = "all" | "outlined" | "filled";

/**
 * A single grid tile: one icon in one fill. With `show: "all"` an icon yields
 * two tiles, so `id` — not `name` — is what identifies a tile, pins it, and
 * keys its Quick Look file.
 */
export interface IconTile extends Icon {
  id: string;
  fill: Fill;
  style: string;
}

export function tileId(name: string, style: string): string {
  return `${style}:${name}`;
}

/**
 * Build a style id from its axes.
 *
 * No longer clamps `square` to radius-0: since corner is a single axis over the
 * five real options (see {@link CORNERS}), an out-of-range pair can't be
 * constructed. A clamp here would only hide a caller's bug.
 */
export function styleId({ join, fill, radius, stroke }: StyleAxes): string {
  return `${join}-${fill}-radius-${radius}-stroke-${stroke}`;
}

/** Grid column counts, matching the Grid Size preference. */
export const GRID_SIZES = [8, 5, 3];
export const GRID_SIZE_LABELS: Record<number, string> = { 8: "Small", 5: "Medium", 3: "Large" };

export const PNG_SIZES = [16, 32, 64, 128, 256, 512] as const;
export type PngSize = (typeof PNG_SIZES)[number];
