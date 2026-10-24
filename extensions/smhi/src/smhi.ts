// Types and fetcher for SMHI's SNOW1gv1 point-forecast API.
// Verified against a live response on 2026-06-12 (lon=18.07, lat=59.33).
// Docs: https://opendata.smhi.se/metfcst/snow1gv1
import { createTtlCache } from "./ttl-cache";

export interface SmhiData {
  air_temperature: number;
  wind_from_direction: number;
  wind_speed: number;
  wind_speed_of_gust: number;
  relative_humidity: number;
  air_pressure_at_mean_sea_level: number;
  visibility_in_air: number;
  thunderstorm_probability: number;
  probability_of_frozen_precipitation: number;
  cloud_area_fraction: number;
  low_type_cloud_area_fraction: number;
  medium_type_cloud_area_fraction: number;
  high_type_cloud_area_fraction: number;
  cloud_base_altitude: number;
  cloud_top_altitude: number;
  precipitation_amount_mean: number;
  precipitation_amount_min: number;
  precipitation_amount_max: number;
  precipitation_amount_median: number;
  probability_of_precipitation: number;
  precipitation_frozen_part: number;
  predominant_precipitation_type_at_surface: number;
  symbol_code: number;
}

export interface SmhiTimeEntry {
  time: string;
  intervalParametersStartTime: string;
  data: SmhiData;
}

export interface SmhiForecast {
  createdTime: string;
  referenceTime: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  timeSeries: SmhiTimeEntry[];
}

export class SmhiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SmhiError";
  }
  get isOutOfCoverage(): boolean {
    return this.status === 404;
  }
}

const SMHI_HOST = "https://opendata-download-metfcst.smhi.se";
const FORECAST_TTL_MS = 30 * 60 * 1000;
const forecastCache = createTtlCache<SmhiForecast>({ namespace: "forecast", ttlMs: FORECAST_TTL_MS });

// SMHI rejects more than 6 decimals; round to be polite and to keep the URL stable for caching.
function pointKey(lon: number, lat: number): { lonStr: string; latStr: string; key: string } {
  const lonStr = lon.toFixed(6);
  const latStr = lat.toFixed(6);
  return { lonStr, latStr, key: `${lonStr},${latStr}` };
}

export async function loadForecast(lon: number, lat: number, signal?: AbortSignal): Promise<SmhiForecast> {
  return forecastCache.getOrLoad(pointKey(lon, lat).key, () => fetchForecast(lon, lat, signal));
}

export function forgetForecast(lon: number, lat: number): void {
  forecastCache.forget(pointKey(lon, lat).key);
}

async function fetchForecast(lon: number, lat: number, signal?: AbortSignal): Promise<SmhiForecast> {
  const { lonStr, latStr } = pointKey(lon, lat);
  const url = `${SMHI_HOST}/api/category/snow1g/version/1/geotype/point/lon/${lonStr}/lat/${latStr}/data.json`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new SmhiError(res.status, `SMHI ${res.status} for (${lonStr}, ${latStr})`);
  }
  return (await res.json()) as SmhiForecast;
}

// SMHI uses 9999 for "not available" on altitude-style fields and -9 for `precipitation_frozen_part`.
export function valueOr(value: number, sentinel: number = 9999): number | undefined {
  return value === sentinel ? undefined : value;
}

export function coordDistanceKm(a: [number, number], b: [number, number]): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
