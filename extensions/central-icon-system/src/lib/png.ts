/**
 * Render icon PNGs to disk for copy / paste / save / Quick Look.
 *
 * Files live under `environment.supportPath/png` with deterministic names, so
 * repeated exports overwrite in place rather than accumulating.
 */

import { environment } from "@raycast/api";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { IconTile, PngSize } from "../types";
import { ensureWasm, renderIconPng } from "./render";
import { readSvg } from "./manifest";

export { renderIconPng };

/** Fixed size used for Quick Look previews. */
const QUICK_LOOK_SIZE: PngSize = 512;

/**
 * Ink for Quick Look previews.
 *
 * Matches what the grid shows — `Color.PrimaryText` resolves to black on a
 * light appearance and white on a dark one — so ⌘Y doesn't render a differently
 * colored icon than the tile it was invoked from. A fixed mid-gray was the
 * earlier choice and read as a mismatch.
 */
function quickLookColor(): string {
  return environment.appearance === "dark" ? "#FFFFFF" : "#000000";
}

/** Load the bundled resvg WASM binary from the extension's assets directory. */
function loadWasm(): Promise<Buffer> {
  return readFile(join(environment.assetsPath, "resvg.wasm"));
}

function pngDir(): string {
  return join(environment.supportPath, "png");
}

/** The deterministic path for one icon at one size. */
function pngPath(id: string, size: PngSize): string {
  // Tile ids contain a ':' separator, which is legal in a POSIX filename but
  // confusing in a Finder reveal — swap it for a dash.
  return join(pngDir(), `${id.replace(/:/g, "-")}-${size}.png`);
}

/**
 * Render an icon to a PNG on disk and return its absolute path.
 *
 * `color` must be an explicit value — the icon's `currentColor` has nothing to
 * inherit from during rasterization.
 */
export async function writeIconPng(tile: IconTile, size: PngSize, color: string): Promise<string> {
  await ensureWasm(loadWasm);
  await mkdir(pngDir(), { recursive: true });

  const path = pngPath(tile.id, size);
  const svg = readSvg(tile.style, tile.name);
  if (!svg) throw new Error(`No geometry for ${tile.name} in ${tile.style}`);

  await writeFile(path, renderIconPng(svg, size, color));
  return path;
}

/** The path a tile's Quick Look PNG will occupy once rendered. */
export function quickLookPath(id: string): string {
  // The ink is part of the identity: switching appearance must not reuse a
  // cached PNG drawn in the opposite color.
  return pngPath(`${id}-${environment.appearance}`, QUICK_LOOK_SIZE);
}

/**
 * Render one tile's Quick Look PNG, if it isn't already on disk.
 *
 * **Deliberately one tile at a time.** The cursors extension pre-renders its
 * whole set on mount, which is fine at ~40 cursors but fatal here: resvg's WASM
 * linear memory only grows, so bulk-rendering 120 tiles reaches ~213 MB RSS and
 * Raycast kills the command at 100 MB. (IconPark's `icons.slice(0, 400)` cap is
 * the same lesson, learned quietly.)
 *
 * Callers render for the selected tile only, so cost is bounded by how many
 * icons the user actually highlights. Returns the path on success, or `null` if
 * rendering failed — a missing preview must never break the grid.
 */
export async function ensureQuickLook(tile: IconTile): Promise<string | null> {
  const path = quickLookPath(tile.id);
  if (existsSync(path)) return path;

  try {
    await ensureWasm(loadWasm);
    await mkdir(pngDir(), { recursive: true });
    const svg = readSvg(tile.style, tile.name);
    if (!svg) return null;
    await writeFile(path, renderIconPng(svg, QUICK_LOOK_SIZE, quickLookColor()));
    return path;
  } catch {
    return null;
  }
}
