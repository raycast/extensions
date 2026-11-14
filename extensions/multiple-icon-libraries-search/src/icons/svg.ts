import { extraLibrary } from "./extra-libraries";
import { CoreLibraryId, IconNode, LibraryId } from "./types";

/** Tiles are drawn black so Raycast's `tintColor` can recolor them for light and dark mode. */
export const TILE_COLOR = "#000";

/** Tiles are declared larger than 24 px so they stay sharp on Retina. */
export const TILE_SIZE = 128;
const COPY_SIZE = 24;
const COPY_VIEWBOX = "0 0 24 24";

// Raycast 2.9 centers an extension's grid image and draws it inside the grid's inset (Grid with
// Inset.Small). The tile's viewBox widens to 32 units around the 24-unit icon, so the drawing sits
// centered at the size it had before 2.9 (measured from screenshots, 2026-10-22). Copied SVGs keep
// the standard 0 0 24 24.
const TILE_VIEW_UNITS = 32;
/** How much of a 24-unit box Hugeicons and Lucide draw in; a 16-unit drawing box is filled edge to edge. */
const DRAWN_UNITS = 20;

function boxSize(viewBox: string): number {
  return Number(viewBox.split(" ")[2]);
}

/**
 * A tile's viewBox. `drawing` is the icon's own box when it fills that box edge to edge (Raycast's
 * 16-unit icons), so it is scaled to the size a 24-unit icon is drawn at.
 */
function tileViewBox(drawing?: string): string {
  const size = drawing ? boxSize(drawing) : 24;
  const units = drawing ? (size * TILE_VIEW_UNITS) / DRAWN_UNITS : TILE_VIEW_UNITS;
  const start = (size / 2 - units / 2).toFixed(2);
  return `${start} ${start} ${Number(units.toFixed(2))} ${Number(units.toFixed(2))}`;
}

export const TILE_VIEWBOX = tileViewBox();

// Each library's own root attributes. Hugeicons carries fill and stroke on every element; Lucide sets
// them once on the root. Other libraries bring their own (extra-libraries.ts).
const ROOT_ATTRIBUTES: Record<CoreLibraryId, Record<string, string>> = {
  hugeicons: { fill: "none" },
  lucide: {
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  },
};

// Looked up when drawing, not when this file loads, since extra-libraries.ts imports this file too.
function rootAttributes(library: LibraryId): Record<string, string> {
  return library === "hugeicons" || library === "lucide"
    ? ROOT_ATTRIBUTES[library]
    : extraLibrary(library).rootAttributes;
}

/** An SVG as JSX: `fill-rule` becomes `fillRule`. */
export function svgToJsx(svg: string): string {
  return svg
    .trim()
    .replace(
      / ([a-z]+(?:-[a-z]+)+)=/g,
      (_, name: string) => ` ${name.replace(/-([a-z])/g, (__, letter: string) => letter.toUpperCase())}=`,
    );
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** Drawing elements an icon may contain. Anything else (script, image, use, foreignObject) is left out. */
const DRAWING_TAGS = new Set(["path", "circle", "ellipse", "line", "polyline", "polygon", "rect", "g"]);

/** Plain presentation attributes only: no event handlers, no links to other content. */
function isSafeAttribute(name: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(name) && !/^on/i.test(name) && !/href/i.test(name);
}

/** `rename` turns the packages' React-style names (`strokeWidth`) into SVG ones. */
function attributes(attrs: Record<string, string>, color: string, rename: (name: string) => string): string {
  return Object.entries(attrs)
    .filter(([name, value]) => name !== "key" && typeof value === "string" && isSafeAttribute(name))
    .map(([name, value]) => ` ${rename(name)}="${escapeAttribute(value === "currentColor" ? color : value)}"`)
    .join("");
}

/** An SVG document, 24 px unless `size` says otherwise. `color` replaces every `currentColor`. */
export function toSvg(
  nodes: IconNode[],
  library: LibraryId,
  color = "currentColor",
  size = COPY_SIZE,
  viewBox = COPY_VIEWBOX,
): string {
  const root = attributes(
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: String(size),
      height: String(size),
      viewBox,
      ...rootAttributes(library),
    },
    color,
    (name) => name,
  );
  const body = nodes
    .filter(([tag]) => DRAWING_TAGS.has(tag))
    .map(([tag, attrs]) => `<${tag}${attributes(attrs, color, kebab)}/>`)
    .join("");
  return `<svg${root}>${body}</svg>\n`;
}

/** A tile as stored for Raycast: black, at tile size, centered. `drawing` as for `tileViewBox`. */
export function toTile(nodes: IconNode[], library: LibraryId, drawing?: string): string {
  return toSvg(nodes, library, TILE_COLOR, TILE_SIZE, drawing ? tileViewBox(drawing) : TILE_VIEWBOX);
}

/**
 * Turns a stored compact tile back into the copyable `currentColor` SVG: 24 px on 0 0 24 24, or at
 * the icon's own box (16 px for Raycast).
 */
export function tileToCopy(tile: string, viewBox = COPY_VIEWBOX): string {
  const size = viewBox === COPY_VIEWBOX ? COPY_SIZE : boxSize(viewBox);
  return tile
    .replace(
      new RegExp(` width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="[^"]*"`),
      ` width="${size}" height="${size}" viewBox="${viewBox}"`,
    )
    .split(`"${TILE_COLOR}"`)
    .join('"currentColor"');
}

/** Stroke widths the Stroke Width setting offers; "default" keeps each library's own (Lucide 2, Hugeicons 1.5). */
export const STROKE_WIDTHS = ["default", "1", "1.5", "2", "2.5"];

/** The width to apply, or undefined for the library's default or an unknown setting value. */
export function strokeOverride(setting: string | undefined): string | undefined {
  return setting && setting !== "default" && STROKE_WIDTHS.includes(setting) ? setting : undefined;
}

/** Sets every stroked line in an SVG to `width`. Unstroked shapes (stroke-width 0 or none) stay as they are. */
export function withStrokeWidth(svg: string, width: string | undefined): string {
  if (!width) return svg;
  return svg.replace(/ stroke-width="([^"]*)"/g, (whole, value: string) =>
    Number(value) > 0 ? ` stroke-width="${width}"` : whole,
  );
}

/** A copyable SVG redrawn at `size` px in a fixed color, for the large preview. */
export function toPreview(copy: string, size: number, color: string): string {
  return copy
    .replace(/ width="\d+" height="\d+"/, ` width="${size}" height="${size}"`)
    .split('"currentColor"')
    .join(`"${escapeAttribute(color)}"`);
}
