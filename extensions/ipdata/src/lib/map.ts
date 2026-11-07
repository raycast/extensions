// Vector road map drawn as SVG from ipdata's own tile archive (the same tiles ipdata.co renders
// its hero map from), served at TILES_BASE/{z}/{x}/{y}.mvt.
import { withCache } from "@raycast/utils";
import { gunzipSync } from "node:zlib";
import { PbfReader } from "pbf";
import { VectorTile } from "@mapbox/vector-tile";

export const TILES_BASE = "https://ipdata.co/tiles/roads-20260928";
const TILE_Z = 12; // the finest zoom in the archive
const TILE_TIMEOUT_MS = 7000;
const MAP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type RoadClass = "motorway" | "trunk" | "primary" | "secondary" | "tertiary";
export const ROAD_CLASSES: RoadClass[] = ["motorway", "trunk", "primary", "secondary", "tertiary"];
const ROAD_CLASS: Record<string, RoadClass> = {
  motorway: "motorway",
  trunk: "trunk",
  primary: "primary",
  secondary: "secondary",
  tertiary: "tertiary",
  motorway_link: "primary",
  trunk_link: "primary",
  primary_link: "secondary",
  secondary_link: "tertiary",
};
const WATER_SKIP = new Set(["swimming_pool", "fountain", "basin"]);
const GREEN = new Set([
  "park",
  "forest",
  "wood",
  "nature_reserve",
  "national_park",
  "golf_course",
  "garden",
  "grass",
  "meadow",
  "scrub",
  "wetland",
  "recreation_ground",
  "cemetery",
  "village_green",
  "allotments",
  "playground",
  "pitch",
  "dog_park",
  "zoo",
  "grassland",
]);

export interface MapSpec {
  lat: number;
  lon: number;
  width: number;
  height: number;
  zoom: number; // render zoom (may be fractional); tiles always come from TILE_Z
}

// SVG path data per layer, in pixel coordinates of a width x height viewport.
export interface MapLayers {
  roads: Record<RoadClass, string>;
  water: string;
  rivers: string;
  green: string;
  tiles: number;
  failed: number;
}

export function project(lon: number, lat: number, zoom: number): [number, number] {
  const n = 256 * 2 ** zoom;
  const r = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * n, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n];
}

const tileMemo = new Map<string, Promise<Uint8Array | null>>();
function fetchTile(x: number, y: number): Promise<Uint8Array | null> {
  const key = `${x}/${y}`;
  let pending = tileMemo.get(key);
  if (!pending) {
    pending = fetchTileNow(x, y).catch((e) => {
      tileMemo.delete(key);
      throw e;
    });
    tileMemo.set(key, pending);
  }
  return pending;
}

async function fetchTileNow(x: number, y: number): Promise<Uint8Array | null> {
  const res = await fetch(`${TILES_BASE}/${TILE_Z}/${x}/${y}.mvt`, {
    signal: AbortSignal.timeout(TILE_TIMEOUT_MS),
    headers: { "User-Agent": "raycast-ipdata" },
  });
  if (res.status === 204) return new Uint8Array(); // open sea
  if (!res.ok) throw new Error(`tile ${TILE_Z}/${x}/${y}: HTTP ${res.status}`);
  let buf = new Uint8Array(await res.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = new Uint8Array(gunzipSync(buf));
  return buf;
}

type Pt = { x: number; y: number };

// A map with some failed tiles is still drawn, but it must not be cached: the cached builder rejects
// with it (withCache never stores a rejection) and mapLayers hands it back.
class PartialMap extends Error {
  layers: MapLayers;
  constructor(layers: MapLayers) {
    super("Some map tiles could not be loaded");
    this.layers = layers;
  }
}

// Complete maps are kept for a week, keyed by the spec.
const completeLayers = withCache(
  async (spec: MapSpec): Promise<MapLayers> => {
    const layers = await buildLayers(spec);
    if (layers.failed > 0) throw new PartialMap(layers);
    return layers;
  },
  { maxAge: MAP_TTL_MS },
);

export async function mapLayers(spec: MapSpec): Promise<MapLayers> {
  try {
    return await completeLayers(spec);
  } catch (e) {
    if (e instanceof PartialMap) return e.layers;
    throw e;
  }
}

async function buildLayers(spec: MapSpec): Promise<MapLayers> {
  const [cx, cy] = project(spec.lon, spec.lat, spec.zoom);
  const ox = cx - spec.width / 2;
  const oy = cy - spec.height / 2;
  const tilePx = 256 * 2 ** (spec.zoom - TILE_Z);
  const tiles: [number, number][] = [];
  for (let tx = Math.floor(ox / tilePx); tx <= Math.floor((ox + spec.width) / tilePx); tx++) {
    for (let ty = Math.floor(oy / tilePx); ty <= Math.floor((oy + spec.height) / tilePx); ty++) tiles.push([tx, ty]);
  }

  const roads: Record<RoadClass, string[]> = { motorway: [], trunk: [], primary: [], secondary: [], tertiary: [] };
  const water: string[] = [];
  const rivers: string[] = [];
  const green: string[] = [];
  let failed = 0;
  const margin = 12;

  await Promise.all(
    tiles.map(async ([tx, ty]) => {
      let buf: Uint8Array | null;
      try {
        buf = await fetchTile(tx, ty);
      } catch {
        failed++;
        return;
      }
      if (!buf || !buf.length) return;
      const vt = new VectorTile(new PbfReader(buf));
      const toPx =
        (extent: number) =>
        (p: Pt): [number, number] => [
          tx * tilePx + (p.x / extent) * tilePx - ox,
          ty * tilePx + (p.y / extent) * tilePx - oy,
        ];
      // A line or ring as path data, simplified to ~0.6 px. It is dropped only when its bounding box misses
      // the view: a road crossing the view, or a park covering it, may have no vertex inside.
      const pathOf = (pts: Pt[], extent: number, close: boolean): string | null => {
        const conv = toPx(extent);
        let d = "";
        let last: [number, number] | null = null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const p of pts) {
          const q = conv(p);
          minX = Math.min(minX, q[0]);
          maxX = Math.max(maxX, q[0]);
          minY = Math.min(minY, q[1]);
          maxY = Math.max(maxY, q[1]);
          if (last && Math.abs(q[0] - last[0]) < 0.6 && Math.abs(q[1] - last[1]) < 0.6) continue;
          d += (last ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1);
          last = q;
        }
        const misses = maxX < -margin || minX > spec.width + margin || maxY < -margin || minY > spec.height + margin;
        if (misses || !last) return null;
        return close ? d + "Z" : d;
      };

      const roadLayer = vt.layers.roads;
      if (roadLayer) {
        for (let i = 0; i < roadLayer.length; i++) {
          const f = roadLayer.feature(i);
          if (f.type !== 2) continue;
          const p = f.properties as Record<string, unknown>;
          const detail = typeof p.kind_detail === "string" ? p.kind_detail : "";
          const kind = typeof p.kind === "string" ? p.kind : "";
          const cls =
            ROAD_CLASS[detail] ?? (kind === "highway" ? "motorway" : kind === "major_road" ? "primary" : null);
          if (!cls) continue;
          for (const line of f.loadGeometry()) {
            const d = pathOf(line, roadLayer.extent, false);
            if (d) roads[cls].push(d);
          }
        }
      }
      const waterLayer = vt.layers.water;
      if (waterLayer) {
        for (let i = 0; i < waterLayer.length; i++) {
          const f = waterLayer.feature(i);
          const kind = (f.properties as Record<string, unknown>).kind;
          if (typeof kind === "string" && WATER_SKIP.has(kind)) continue;
          if (f.type === 2) {
            for (const line of f.loadGeometry()) {
              const d = pathOf(line, waterLayer.extent, false);
              if (d) rivers.push(d);
            }
            continue;
          }
          if (f.type !== 3) continue;
          for (const ring of f.loadGeometry()) {
            const d = pathOf(ring, waterLayer.extent, true);
            if (d) water.push(d);
          }
        }
      }
      const landLayer = vt.layers.landuse;
      if (landLayer) {
        for (let i = 0; i < landLayer.length; i++) {
          const f = landLayer.feature(i);
          if (f.type !== 3) continue;
          const kind = (f.properties as Record<string, unknown>).kind;
          if (typeof kind !== "string" || !GREEN.has(kind)) continue;
          for (const ring of f.loadGeometry()) {
            const d = pathOf(ring, landLayer.extent, true);
            if (d) green.push(d);
          }
        }
      }
    }),
  );

  // Dense cities would turn into a hairball (and a huge SVG): shed the smallest classes first.
  const size = () => Object.values(roads).reduce((n, arr) => n + arr.join("").length, 0);
  if (size() > 70_000) roads.tertiary = [];
  if (size() > 110_000) roads.secondary = [];

  const layers: MapLayers = {
    roads: {
      motorway: roads.motorway.join(""),
      trunk: roads.trunk.join(""),
      primary: roads.primary.join(""),
      secondary: roads.secondary.join(""),
      tertiary: roads.tertiary.join(""),
    },
    water: water.join(""),
    rivers: rivers.join(""),
    green: green.join(""),
    tiles: tiles.length,
    failed,
  };
  // A map whose every tile failed is an error, shown as unavailable.
  if (tiles.length && failed === tiles.length) throw new Error("Map tiles could not be loaded");
  return layers;
}
