// Slippy-map tile math and tile sources for the radar view. Pure module.
//
// Basemap: Esri Canvas tiles (keyless, attribution required).
// Radar overlay: RainViewer public API (free, no key).

export const TILE_PX = 256;
/** 5×5 grid; the centre lands in the middle tile, so an 840×620 frame around it never runs off the grid. */
export const GRID = 5;
export const RADAR_ZOOM = 8;
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 10;
/** RainViewer serves no tiles above this zoom; deeper views upscale coarser tiles. */
const RAINVIEWER_MAX_ZOOM = 7;

export interface TileGrid {
  zoom: number;
  /** Top-left tile of the grid. */
  tx0: number;
  ty0: number;
  /** Pixel position of the centre inside the grid image. */
  px: number;
  py: number;
}

/** Fractional slippy-map coordinates for a lat/lon at a zoom level. */
export function tilePoint(latitude: number, longitude: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const latRad = (latitude * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  };
}

/** Inverse of tilePoint. */
export function tileToLatLon(x: number, y: number, zoom: number): { latitude: number; longitude: number } {
  const n = 2 ** zoom;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { latitude: (latRad * 180) / Math.PI, longitude: (x / n) * 360 - 180 };
}

export function tileGrid(latitude: number, longitude: number, zoom = RADAR_ZOOM): TileGrid {
  const { x, y } = tilePoint(latitude, longitude, zoom);
  const half = Math.floor(GRID / 2);
  const tx0 = Math.floor(x) - half;
  const ty0 = Math.floor(y) - half;
  return { zoom, tx0, ty0, px: (x - tx0) * TILE_PX, py: (y - ty0) * TILE_PX };
}

/** Approximate width of the visible 840pt frame in km. */
export function frameWidthKm(latitude: number, zoom = RADAR_ZOOM): number {
  const kmPerTile = (40075 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
  return Math.round((kmPerTile * 840) / TILE_PX);
}

export function basemapTileUrl(zoom: number, x: number, y: number, dark: boolean): string {
  const layer = dark ? "Canvas/World_Dark_Gray_Base" : "Canvas/World_Light_Gray_Base";
  // Note: Esri tile paths are z/y/x, not z/x/y.
  return `https://services.arcgisonline.com/arcgis/rest/services/${layer}/MapServer/tile/${zoom}/${y}/${x}`;
}

export interface RainViewerFrame {
  time: number;
  path: string;
}

export interface RainViewerMaps {
  host: string;
  radar: { past: RainViewerFrame[]; nowcast: RainViewerFrame[] };
}

export const RAINVIEWER_MAPS_URL = "https://api.rainviewer.com/public/weather-maps.json";

function isFrame(v: unknown): v is RainViewerFrame {
  const f = v as Partial<RainViewerFrame> | null;
  return typeof f?.time === "number" && typeof f.path === "string" && f.path.startsWith("/");
}

/** Shape check for the RainViewer index; `host` becomes a fetch origin, so it is pinned to RainViewer over HTTPS. */
export function isRainViewerMaps(v: unknown): v is RainViewerMaps {
  const m = v as Partial<RainViewerMaps> | null;
  if (!m || typeof m.host !== "string") return false;
  if (!/^https:\/\/([a-z0-9-]+\.)*rainviewer\.com$/i.test(m.host)) return false;
  const radar = m.radar as Partial<RainViewerMaps["radar"]> | undefined;
  return (
    Array.isArray(radar?.past) &&
    Array.isArray(radar?.nowcast) &&
    radar.past.every(isFrame) &&
    radar.nowcast.every(isFrame)
  );
}

/** Color scheme 4 = classic green→red; options: smoothed, with snow layer. */
export function radarTileUrl(maps: RainViewerMaps, frame: RainViewerFrame, zoom: number, x: number, y: number): string {
  return `${maps.host}${frame.path}/${TILE_PX}/${zoom}/${x}/${y}/4/1_1.png`;
}

/**
 * RainViewer data tops out at a lower zoom than the basemap, so the radar is
 * fetched at a coarser zoom and each tile drawn scaled up. Radar echoes are
 * smooth blobs; the upscale is invisible.
 */
export interface RadarGrid {
  zoom: number;
  rx0: number;
  ry0: number;
  cols: number;
  rows: number;
  /** Where radar tile (0,0) lands in the base grid's pixel space. */
  originX: number;
  originY: number;
  /** Rendered size of one radar tile in base-grid pixels. */
  tilePx: number;
}

export function radarGridFor(grid: TileGrid): RadarGrid {
  const zoom = Math.min(grid.zoom - 1, RAINVIEWER_MAX_ZOOM);
  const scale = 2 ** (grid.zoom - zoom);
  const rx0 = Math.floor(grid.tx0 / scale);
  const ry0 = Math.floor(grid.ty0 / scale);
  const lastCol = Math.floor((grid.tx0 + GRID - 1) / scale);
  const lastRow = Math.floor((grid.ty0 + GRID - 1) / scale);
  return {
    zoom,
    rx0,
    ry0,
    cols: lastCol - rx0 + 1,
    rows: lastRow - ry0 + 1,
    originX: (rx0 * scale - grid.tx0) * TILE_PX,
    originY: (ry0 * scale - grid.ty0) * TILE_PX,
    tilePx: TILE_PX * scale,
  };
}

export interface FetchedTile {
  /** Column/row within the grid (0..GRID-1). */
  col: number;
  row: number;
  /** data: URI for SVG embedding; only present after `withHrefs`. */
  href?: string;
  /** Raw image bytes, undefined when the tile failed to load. */
  buf?: Buffer;
}

/** Esri basemap tiles may be JPEG; declare what the bytes actually are. */
export function tileMime(buf: Buffer): string {
  return buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg" : "image/png";
}

/** Add data: URIs (≈1.33× the image size) only to the grids the SVG card embeds. */
export function withHrefs(tiles: FetchedTile[]): FetchedTile[] {
  return tiles.map((t) => (t.buf ? { ...t, href: `data:${tileMime(t.buf)};base64,${t.buf.toString("base64")}` } : t));
}

/** A radar render is ~275 tiles; cap in-flight requests so the tile servers aren't hammered. */
const MAX_IN_FLIGHT = 12;
const TILE_TIMEOUT_MS = 15_000;
/** A 256px tile is a few KB; anything near this is not a tile. */
const MAX_TILE_BYTES = 1_048_576;

async function fetchTile(url: string, signal: AbortSignal | undefined): Promise<Buffer> {
  const timeout = AbortSignal.timeout(TILE_TIMEOUT_MS);
  const res = await fetch(url, {
    headers: { "User-Agent": "raycast-weather-extension" },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new Error(`Tile fetch failed (${res.status})`);
  if (Number(res.headers.get("content-length")) > MAX_TILE_BYTES) throw new Error("Tile too large");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_TILE_BYTES) throw new Error("Tile too large");
  return buf;
}

/**
 * Fetch a grid of tiles with bounded concurrency; failed tiles come back with
 * no `buf`. Aborting the signal rejects with the AbortError, so callers can
 * tell "cancelled" from "some tiles missing".
 */
export async function fetchTileGrid(
  urlFor: (x: number, y: number) => string,
  x0: number,
  y0: number,
  cols = GRID,
  rows = GRID,
  signal?: AbortSignal,
): Promise<FetchedTile[]> {
  const cells: { col: number; row: number }[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) cells.push({ col, row });

  const out: FetchedTile[] = new Array(cells.length);
  let next = 0;
  const worker = async () => {
    while (next < cells.length) {
      signal?.throwIfAborted();
      const i = next++;
      const { col, row } = cells[i];
      try {
        out[i] = { col, row, buf: await fetchTile(urlFor(x0 + col, y0 + row), signal) };
      } catch (error) {
        if (signal?.aborted) throw error;
        out[i] = { col, row };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_IN_FLIGHT, cells.length) }, worker));
  return out;
}
