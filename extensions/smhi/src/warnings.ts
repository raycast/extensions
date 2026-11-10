// SMHI public weather warnings ("varningar"). No API key.
// API: https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json
// Each warning event has one or more warningAreas; each area carries a GeoJSON polygon
// in EPSG:4326 so we can filter to a point client-side.
import { Color, Icon } from "@raycast/api";
import { createTtlCache } from "./ttl-cache";

export type WarningLevelCode = "MESSAGE" | "YELLOW" | "ORANGE" | "RED";

interface LocalizedText {
  sv?: string;
  en?: string;
  code?: string;
}

interface WarningDescription {
  title: LocalizedText;
  text: LocalizedText;
}

// SMHI's `area` field can be either a single Feature or a FeatureCollection.
// Geometries seen in the wild: Polygon, MultiPolygon, LineString (e.g. river warnings).
// Only polygon shapes are testable with point-in-polygon; others are skipped.
type WarningGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: string; coordinates: unknown };
type WarningFeature = { type: "Feature"; geometry?: WarningGeometry };
type WarningAreaGeoJson = WarningFeature | { type: "FeatureCollection"; features: WarningFeature[] };

interface WarningAreaRaw {
  id: number;
  approximateStart: string;
  approximateEnd?: string;
  published: string;
  normalProbability: boolean;
  areaName: LocalizedText;
  warningLevel: LocalizedText & { code: WarningLevelCode };
  eventDescription: LocalizedText;
  affectedAreas?: Array<{ id: number; sv?: string; en?: string }>;
  descriptions?: WarningDescription[];
  area?: WarningAreaGeoJson;
}

interface WarningEventRaw {
  id: number;
  event: LocalizedText;
  warningAreas: WarningAreaRaw[];
  descriptions?: WarningDescription[];
}

export interface ResolvedWarning {
  eventId: number;
  areaId: number;
  level: WarningLevelCode;
  eventLabel: string;
  areaLabel: string;
  start: string;
  end?: string;
  descriptions: Array<{ title: string; text: string }>;
}

const WARNINGS_URL = "https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json";
const WARNINGS_TTL_MS = 30 * 60 * 1000;
// One feed covers the whole country, so a single key is enough.
const WARNINGS_KEY = "all";
const warningsCache = createTtlCache<WarningEventRaw[]>({ namespace: "warnings", ttlMs: WARNINGS_TTL_MS });

export async function loadWarnings(signal?: AbortSignal): Promise<WarningEventRaw[]> {
  return warningsCache.getOrLoad(WARNINGS_KEY, () => fetchWarnings(signal));
}

export function forgetWarnings(): void {
  warningsCache.forget(WARNINGS_KEY);
}

async function fetchWarnings(signal?: AbortSignal): Promise<WarningEventRaw[]> {
  const res = await fetch(WARNINGS_URL, { signal });
  if (!res.ok) throw new Error(`SMHI warnings ${res.status}`);
  return (await res.json()) as WarningEventRaw[];
}

function en(text: LocalizedText | undefined, fallback: string = ""): string {
  return text?.en ?? text?.sv ?? fallback;
}

// Ray-casting point-in-polygon. `ring` is a single linear ring [[lon, lat], ...].
function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeometry(lon: number, lat: number, geom: WarningGeometry | undefined): boolean {
  if (!geom) return false;
  if (geom.type === "Polygon") {
    const polygon = geom.coordinates as number[][][];
    // Outer ring at [0]; holes at [1..]. Inside the outer ring and outside every hole = inside.
    if (!polygon.length || !pointInRing(lon, lat, polygon[0])) return false;
    for (let i = 1; i < polygon.length; i++) {
      if (pointInRing(lon, lat, polygon[i])) return false;
    }
    return true;
  }
  if (geom.type === "MultiPolygon") {
    const polygons = geom.coordinates as number[][][][];
    for (const polygon of polygons) {
      if (!polygon.length || !pointInRing(lon, lat, polygon[0])) continue;
      let inHole = false;
      for (let i = 1; i < polygon.length; i++) {
        if (pointInRing(lon, lat, polygon[i])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
    return false;
  }
  // LineString / Point / other geometries can't be tested with point-in-polygon, so skip them.
  return false;
}

function pointInArea(lon: number, lat: number, area: WarningAreaGeoJson | undefined): boolean {
  if (!area) return false;
  if (area.type === "FeatureCollection") {
    return area.features.some((feature) => pointInGeometry(lon, lat, feature.geometry));
  }
  return pointInGeometry(lon, lat, area.geometry);
}

const LEVEL_PRIORITY: Record<WarningLevelCode, number> = {
  RED: 3,
  ORANGE: 2,
  YELLOW: 1,
  MESSAGE: 0,
};

export function warningsAt(lat: number, lon: number, events: WarningEventRaw[]): ResolvedWarning[] {
  const matches: ResolvedWarning[] = [];
  for (const event of events) {
    for (const area of event.warningAreas) {
      if (!pointInArea(lon, lat, area.area)) continue;
      matches.push({
        eventId: event.id,
        areaId: area.id,
        level: area.warningLevel.code,
        eventLabel: en(event.event, "Warning"),
        areaLabel: en(area.areaName, ""),
        start: area.approximateStart,
        end: area.approximateEnd,
        descriptions: (area.descriptions ?? []).map((desc) => ({
          title: en(desc.title, ""),
          text: en(desc.text, ""),
        })),
      });
    }
  }
  matches.sort((a, b) => LEVEL_PRIORITY[b.level] - LEVEL_PRIORITY[a.level]);
  return matches;
}

const LEVEL_PRESENTATION = {
  RED: { label: "Red", icon: Icon.ExclamationMark, color: Color.Red, emoji: "🔴" },
  ORANGE: { label: "Orange", icon: Icon.Warning, color: Color.Orange, emoji: "🟠" },
  YELLOW: { label: "Yellow", icon: Icon.Warning, color: Color.Yellow, emoji: "🟡" },
  MESSAGE: { label: "Message", icon: Icon.Info, color: Color.Blue, emoji: "🔵" },
} as const satisfies Record<WarningLevelCode, { label: string; icon: Icon; color: Color; emoji: string }>;

export function levelPresentation(level: WarningLevelCode) {
  return LEVEL_PRESENTATION[level];
}
