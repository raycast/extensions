import { COORD_PRECISION } from "./utils/location-key";

export type GraphMode = "detailed" | "summary";
export type GraphPaletteId = "light" | "dark";
const GRAPH_ALL_DATES_TOKEN = "all";
const GRAPH_NO_TIME_TOKEN = "none";
const GRAPH_NO_SUN_DATES_TOKEN = "none";

function encodePart(value: string): string {
  return encodeURIComponent(value);
}

export function apiCacheKey(prefix: string, suffix: string): string {
  return `${prefix}:${suffix}`;
}

export function coordSuffix(lat: number, lon: number): string {
  return `${lat.toFixed(COORD_PRECISION)},${lon.toFixed(COORD_PRECISION)}`;
}

export function graphCachePrefix(locationKey: string): string {
  return `graph:${locationKey}:`;
}

export function graphModeToken(mode: GraphMode): string {
  return `:mode=${mode}:`;
}

export function graphTargetDateToken(targetDate: string): string {
  return `:targetDate=${encodePart(targetDate)}:`;
}

export function graphCacheKey(params: {
  locationKey: string;
  mode: GraphMode;
  paletteId: GraphPaletteId;
  seriesLength: number;
  firstTime?: string;
  lastTime?: string;
  units: string;
  clockFormat: string;
  showSunTimes: boolean;
  showWindDirection: boolean;
  dataHash: string;
  sunHash?: string;
  targetDate?: string;
  sunDates: string[];
}): string {
  const normalizedSunDates = [...new Set(params.sunDates)].sort().join(",");
  return [
    `graph:${params.locationKey}`,
    `mode=${params.mode}`,
    `palette=${params.paletteId}`,
    `series=${params.seriesLength}`,
    `first=${encodePart(params.firstTime ?? GRAPH_NO_TIME_TOKEN)}`,
    `last=${encodePart(params.lastTime ?? GRAPH_NO_TIME_TOKEN)}`,
    `units=${encodePart(params.units)}`,
    `clock=${encodePart(params.clockFormat)}`,
    `sunTimes=${params.showSunTimes ? "1" : "0"}`,
    `windDir=${params.showWindDirection ? "1" : "0"}`,
    `data=${encodePart(params.dataHash)}`,
    `sun=${encodePart(params.sunHash ?? GRAPH_NO_SUN_DATES_TOKEN)}`,
    `targetDate=${encodePart(params.targetDate ?? GRAPH_ALL_DATES_TOKEN)}`,
    `sunDates=${encodePart(normalizedSunDates || GRAPH_NO_SUN_DATES_TOKEN)}`,
  ].join(":");
}
