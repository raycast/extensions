/**
 * Load icon metadata and read geometry on demand.
 *
 * **Why the split.** Raycast kills a command at 100 MB. A Node baseline is
 * ~42 MB and resvg's WASM adds ~16 MB, so the extension starts with barely
 * 40 MB to spend. Holding both styles' SVG strings resident costs ~26 MB and
 * pushed first paint to 101 MB — over the limit before a single tile existed.
 *
 * So metadata (names, categories, keywords: 0.26 MB per style) is resident, and
 * geometry lives in a flat `.svg` blob read by byte offset. A JSON map would
 * defeat this: parsing it to read one icon makes every icon resident. Random
 * access measured at ~1 ms for 400 icons, with flat memory.
 *
 * Manifests are built by `npm run build:icons` and are NOT committed — they hold
 * proprietary geometry. A missing manifest is an expected first-run state, not
 * a crash.
 */

import { environment } from "@raycast/api";
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Corner, Fill, IconTile, Join, Radius, StyleAxes, StyleIndex, Stroke } from "../types";
import { CORNERS, FILLS, STROKES, styleId, tileId } from "../types";

/** Parsed indexes, keyed by style id. Read once per process, not per render. */
const indexCache = new Map<string, StyleIndex | null>();

/** Open file descriptors for geometry blobs, keyed by style id. */
const blobHandles = new Map<string, number | null>();

/**
 * Where a style's data lives, checked in priority order.
 *
 * `supportPath` first: that's where the extension installs styles at runtime,
 * and it survives extension updates. `assetsPath` second, so a developer who
 * ran `npm run build:icons` still gets their local build without reinstalling.
 *
 * A Store install has nothing in `assets/` — the data is gitignored — which is
 * exactly why runtime installation exists.
 */
/**
 * The root holding a *complete* copy of a style — both index and geometry.
 *
 * Resolved as a pair, never file-by-file. Locating each file independently
 * would let the index come from `supportPath` while the blob came from
 * `assets/`, and the index's byte offsets are only valid for the blob it was
 * written with: a mismatch reads garbage rather than failing.
 */
/**
 * Both on-disk layouts, resolved as a *pair* so index and geometry always come
 * from the same install.
 *
 * - `supportPath/icons/<style>/{index.json,geometry.svg}` — runtime installs,
 *   published by a single atomic directory rename (see `install-style.ts`).
 * - `assetsPath/central-icons.<style>.{index.json,svg}` — the flat layout the
 *   development build script writes.
 *
 * Resolving file-by-file would let the index come from one root and the blob
 * from another; the index's byte offsets are only valid for the blob written
 * alongside it, so a mismatch reads garbage instead of failing.
 */
function stylePaths(style: string): { index: string; blob: string } | null {
  const installed = {
    index: join(environment.supportPath, "icons", style, "index.json"),
    blob: join(environment.supportPath, "icons", style, "geometry.svg"),
  };
  const bundled = {
    index: join(environment.assetsPath, `central-icons.${style}.index.json`),
    blob: join(environment.assetsPath, `central-icons.${style}.svg`),
  };
  for (const candidate of [installed, bundled]) {
    if (existsSync(candidate.index) && existsSync(candidate.blob)) return candidate;
  }
  return null;
}

function indexPath(style: string): string | null {
  return stylePaths(style)?.index ?? null;
}

function blobPath(style: string): string | null {
  return stylePaths(style)?.blob ?? null;
}

/**
 * Read one style's metadata index. Returns `null` when it hasn't been built,
 * which is the normal state before `npm run build:icons` has run.
 */
export function loadIndex(style: string): StyleIndex | null {
  const hit = indexCache.get(style);
  // Only a successful read is memoized. Caching the miss would mean a style
  // built *while the command is open* stays invisible until relaunch — the
  // exact moment a user is most likely to look for it, having just run the
  // build command the download screen told them to run.
  if (hit) return hit;

  // Load the index and its geometry as one generation, retrying if the pair is
  // swapped underneath us mid-read.
  //
  // Reading the index and then opening the blob is two syscalls with a gap. An
  // install landing in that gap would hand back offsets from the old index
  // paired with a descriptor on the new blob — the same corruption this pairing
  // exists to prevent, just through a narrower window. So the index is read
  // again after the descriptor is open: identical content means nothing moved
  // and the pair is coherent. Two attempts is plenty for a swap that is a
  // single rename.
  let index: StyleIndex | null = null;
  for (let attempt = 0; attempt < 2 && !index; attempt++) {
    let raw: string | null = null;
    try {
      const path = indexPath(style);
      raw = path ? readFileSync(path, "utf8") : null;
    } catch {
      // ENOENT for an unbuilt style is expected; a malformed file is not, but
      // the recovery is identical (rebuild) so they share a path.
      raw = null;
    }
    if (raw === null) break;

    let parsed: StyleIndex | null = null;
    try {
      parsed = JSON.parse(raw) as StyleIndex;
    } catch {
      break;
    }

    // Pin the geometry, then confirm the index still reads the same. A style
    // swapped between the two reads is retried against the new generation.
    openBlob(style);
    let after: string | null = null;
    try {
      const path = indexPath(style);
      after = path ? readFileSync(path, "utf8") : null;
    } catch {
      after = null;
    }

    if (after === raw) {
      index = parsed;
    } else {
      // The pair moved. Drop the descriptor we just pinned to the old
      // generation and read again.
      closeBlob(style);
    }
  }

  if (index) {
    indexCache.set(style, index);
    // Open the geometry NOW, in the same breath as caching the offsets.
    //
    // These two caches used to fill independently and lazily, which let them
    // describe different generations of the data. Concretely: the search grid
    // reads the index at launch but touches no geometry until the user copies
    // something; if Update Icon Data publishes a new pair in between, the blob
    // is opened *after* the swap and the cached offsets — computed for the old
    // blob — are applied to the new one. Reads then land mid-icon and return
    // spliced fragments of two SVGs, with no error raised. (Reproduced: a read
    // that should have returned one icon returned the tail of one plus the head
    // of the next.)
    //
    // Opening here pins the file the offsets belong to: the descriptor keeps
    // the old inode alive after a rename, so an index/blob pair loaded together
    // stays coherent for the life of the command even as the on-disk files are
    // replaced underneath it. (The descriptor was already opened by the loop
    // above; this is the memoized hit.)
    openBlob(style);
  }
  return index;
}

/** Close and forget one style's geometry descriptor. */
function closeBlob(style: string): void {
  const fd = blobHandles.get(style);
  if (fd !== null && fd !== undefined) {
    try {
      closeSync(fd);
    } catch {
      // Already closed — nothing to recover.
    }
  }
  blobHandles.delete(style);
}

/**
 * Open and memoize a style's geometry blob.
 *
 * Always reached through `loadIndex` so the descriptor and the offset table are
 * acquired as a unit — see the note there. Kept separate only so `readSvg` can
 * retrieve the memoized descriptor without re-reading the index.
 */
function openBlob(style: string): number | null {
  const hit = blobHandles.get(style);
  if (hit !== undefined) return hit;

  let fd: number | null = null;
  try {
    const path = blobPath(style);
    fd = path ? openSync(path, "r") : null;
  } catch {
    fd = null;
  }
  blobHandles.set(style, fd);
  return fd;
}

/**
 * Bounded cache of rendered data URIs, keyed by tile id.
 *
 * **Why a cache and not a position window.** The previous design gave artwork
 * only to the first N tiles in display order. That failed the moment Raycast
 * filtered: searching "bug" surfaces matches at positions 696–2205, all of which
 * fell outside the window and rendered as placeholder circles. Raycast filters
 * internally and exposes no scroll event, so *which* tiles are on screen is
 * unknowable — but every tile it draws calls through here, so caching by id
 * bounds memory without needing to know.
 *
 * Insertion-ordered `Map` gives LRU eviction for free: re-reading a hit moves it
 * to the end, and the oldest entry is always `keys().next()`.
 *
 * **Cap sizing.** Measured against Raycast's 100 MB limit, in a fresh process
 * per run (reusing one process measures accumulated garbage, not the cap):
 *
 * | State | RSS |
 * |---|---|
 * | floor — WASM + both indexes + tile list | 74 MB |
 * | + 4,156 `Grid.Item`s with no content | 79 MB |
 * | + every tile's URI cached, backdrop on | 98 MB |
 *
 * That last row is a deliberate worst case — it forces all 4,156 tiles through
 * the cache in one pass, which real use never does. 500/700/900 all measured the
 * same 98 MB there, because the ~19 MB of URI strings is dominated by *how many
 * distinct tiles got drawn*, not by the cap. The cap's job is bounding a long
 * session, not the first paint.
 *
 * 600 is chosen over 900 for margin: it comfortably exceeds any realistic
 * viewport (a Small grid shows ~40 at once) while leaving room if a future style
 * ships heavier geometry.
 */
const URI_CACHE_LIMIT = 600;
const uriCache = new Map<string, string>();

/** Fetch a tile's data URI, rendering and caching it on first request. */
export function cachedDataUri(key: string, build: () => string | null): string | null {
  const hit = uriCache.get(key);
  if (hit !== undefined) {
    // Refresh recency: delete + re-set moves the key to the end of the Map.
    uriCache.delete(key);
    uriCache.set(key, hit);
    return hit;
  }

  const built = build();
  if (built === null) return null;

  uriCache.set(key, built);
  if (uriCache.size > URI_CACHE_LIMIT) {
    const oldest = uriCache.keys().next();
    if (!oldest.done) uriCache.delete(oldest.value);
  }
  return built;
}

/**
 * Forget every cached index and close open blob handles.
 *
 * Required after a rebuild: `loadIndex` memoizes successful reads, so without
 * this the post-update version read returns the pre-update value and the run
 * always reports "already up to date". Blob descriptors point at files the
 * rebuild replaced, so they're released too.
 */
export function invalidateManifests(): void {
  indexCache.clear();
  closeBlobs();
  uriCache.clear();
}

/** Drop every cached URI. Call when the rendering parameters change. */
export function clearUriCache(): void {
  uriCache.clear();
}

/**
 * Read one icon's SVG from its style's geometry blob.
 *
 * Returns `null` if the style isn't built or the icon isn't in its offset
 * table — callers render a placeholder rather than failing.
 */
export function readSvg(style: string, name: string): string | null {
  const index = loadIndex(style);
  const entry = index?.offsets?.[name];
  if (!entry) return null;

  const fd = openBlob(style);
  if (fd === null) return null;

  const [offset, length] = entry;
  try {
    const buffer = Buffer.allocUnsafe(length);
    readSync(fd, buffer, 0, length, offset);
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

/** Release blob file descriptors. Called when the command unmounts. */
export function closeBlobs(): void {
  for (const fd of blobHandles.values()) {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // Already closed or never opened — nothing to recover.
      }
    }
  }
  blobHandles.clear();
}

/**
 * Build the tile list for the current axes and fill filter.
 *
 * Tiles carry metadata only — no `svg` field. Geometry is fetched per icon via
 * {@link readSvg} when a tile is actually rendered, copied, or exported.
 *
 * Fill is an axis of the *style id*, so showing both fills means reading two
 * indexes and interleaving them, so an icon's variants sit adjacent in the grid.
 *
 * `missing` lists any style whose index isn't built, so the caller can tell
 * "no icons" from "not built yet".
 */
export function loadTiles(axes: Omit<StyleAxes, "fill">, fills: Fill[]): { tiles: IconTile[]; missing: string[] } {
  const missing: string[] = [];
  const loaded: { fill: Fill; index: StyleIndex }[] = [];

  for (const fill of fills) {
    const style = styleId({ ...axes, fill });
    const index = loadIndex(style);
    if (!index) missing.push(style);
    else loaded.push({ fill, index });
  }

  if (loaded.length === 0) return { tiles: [], missing };

  // Index by name up front; a `.find()` per icon per style would be O(n²) over
  // 2,078 icons.
  const indexed = loaded.map((entry) => ({
    ...entry,
    byName: new Map(entry.index.icons.map((icon) => [icon.name, icon])),
  }));

  const tiles: IconTile[] = [];
  for (const { name } of loaded[0].index.icons) {
    for (const entry of indexed) {
      const source = entry.byName.get(name);
      if (!source) continue;
      tiles.push({
        ...source,
        id: tileId(source.name, entry.index.style),
        fill: entry.fill,
        style: entry.index.style,
      });
    }
  }

  return { tiles, missing };
}

/**
 * The upstream version any installed style was built from.
 *
 * Every style in the scope publishes in lockstep, so the first installed one
 * answers for all of them. Returns `null` when nothing is installed.
 */
export function installedVersion(): string | null {
  for (const style of availableStyles()) {
    const index = loadIndex(style);
    if (index?.version) return index.version;
  }
  return null;
}

/** Categories present across the loaded indexes, sorted, for the dropdown. */
export function categoriesFor(tiles: IconTile[]): string[] {
  return [...new Set(tiles.map((t) => t.category).filter((c): c is string => Boolean(c)))].sort();
}

/**
 * Which styles have actually been built.
 *
 * The style submenus must offer only these. Offering all 30 axis combinations
 * when two are built lets the user persist a selection with no data behind it —
 * a dead end that survives relaunch, because the choice lives in `useCachedState`.
 */
export function availableStyles(): Set<string> {
  const styles = new Set<string>();

  // Runtime installs: one directory per style. `stylePaths` confirms both files
  // are present, so a half-written or mid-swap directory is never reported as
  // installed.
  try {
    for (const entry of readdirSync(join(environment.supportPath, "icons"))) {
      // `.abandoned-` is a quarantined staging directory (see `quarantine` in
      // install-style.ts) — data on disk, but never a valid installed style.
      if (entry.includes(".staging-") || entry.includes(".retired-") || entry.includes(".abandoned-")) continue;
      if (stylePaths(entry)) styles.add(entry);
    }
  } catch {
    // No support-path data yet — expected until the first install.
  }

  // Development builds: the flat layout in `assets/`.
  try {
    for (const file of readdirSync(environment.assetsPath)) {
      const match = /^central-icons\.(.+)\.index\.json$/.exec(file);
      if (match && stylePaths(match[1])) styles.add(match[1]);
    }
  } catch {
    // Assets unreadable — the caller surfaces the empty state.
  }

  return styles;
}

/**
 * Axes of the first built style, used to recover from a persisted selection
 * that has no data behind it. Returns `null` when nothing is built at all —
 * the caller shows the "not built" empty state instead.
 */
export function defaultBuiltAxes(): Omit<StyleAxes, "fill"> | null {
  for (const style of availableStyles()) {
    const parsed = /^(round|square)-(?:filled|outlined)-radius-([0-3])-stroke-(1|1\.5|2)$/.exec(style);
    if (parsed) {
      return {
        join: parsed[1] as Join,
        radius: Number(parsed[2]) as Radius,
        stroke: parsed[3] as Stroke,
      };
    }
  }
  return null;
}

/** One selectable axis value, and whether its data exists on disk. */
export interface AxisOption<T> {
  value: T;
  built: boolean;
}

/**
 * Every axis value, each flagged with whether it has been built.
 *
 * **Not a filter.** An earlier version listed only reachable values, which
 * traded one failure for a worse one: with two styles built (both
 * `radius-2-stroke-1.5`) every axis collapsed to a single option, so the style
 * controls looked broken and the other 28 styles were unreachable — you could
 * never build them, because you could never select them.
 *
 * So all values are always offered. Unbuilt ones are marked in the menu and
 * selecting one lands on the "not built" screen, which carries both a recovery
 * action and the exact build command. Discoverable, and never a dead end.
 */
export function axisOptions(current: Omit<StyleAxes, "fill">): {
  corners: AxisOption<Corner>[];
  strokes: AxisOption<Stroke>[];
} {
  const built = availableStyles();
  const exists = (axes: Omit<StyleAxes, "fill">) => FILLS.some((fill) => built.has(styleId({ ...axes, fill })));

  return {
    corners: CORNERS.map((corner) => ({ value: corner, built: exists({ ...current, ...corner }) })),
    strokes: STROKES.map((stroke) => ({ value: stroke, built: exists({ ...current, stroke }) })),
  };
}
