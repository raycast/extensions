/**
 * Open-Meteo forecast client. Free, no API key: https://open-meteo.com/en/docs
 *
 * Each resort is queried at its base and top elevation; the elevation parameter controls
 * Open-Meteo's statistical downscaling. Resorts without elevations get a single point with
 * elevation=nan, which disables downscaling and uses the model grid cell's height.
 * All locations are batched as comma-separated coordinates, chunked to keep URLs short.
 *
 * Units (metric request): snowfall cm, rain mm, snow_depth m, temperature °C, freezing level m, wind km/h,
 * visibility m. Daily totals are computed from the hourly data: Open-Meteo counts a request with more
 * than 10 variables as several calls against its free limit, and this stays at exactly 10.
 */
import type { Resort } from "../types";

const API_URL = "https://api.open-meteo.com/v1/forecast";
const MAX_URL_LENGTH = 2000;
const HOURLY = [
  "snowfall",
  "rain",
  "snow_depth",
  "temperature_2m",
  "freezing_level_height",
  "wind_speed_10m",
  "wind_gusts_10m",
  "weather_code",
  "visibility",
  "is_day",
] as const;

type Series = (number | null)[];

type ApiLocation = {
  elevation: number;
  utc_offset_seconds: number;
  hourly: { time: string[] } & Record<(typeof HOURLY)[number], Series>;
};

type Point = { lat: number; lon: number; elevation: number };

export type DayForecast = {
  date: string;
  snowfall: number | null;
  tempMax: number | null;
  tempMin: number | null;
};

/** Metric values; null means the model didn't provide it. */
export type PointForecast = {
  elevation: number;
  last24h: number | null;
  next24h: number | null;
  next72h: number | null;
  next7d: number | null;
  /** Snow that fell in the 7 days up to now, in cm. */
  last7d: number | null;
  /**
   * Modeled snow depth in cm. Only a hint for drawing snow on the mountain: forecast values ignore
   * elevation and vary wildly between weather models, so it's never shown as a number.
   */
  snowDepth: number | null;
  temperature: number | null;
  freezingLevel: number | null;
  windSpeed: number | null;
  windGusts: number | null;
  /** Snow (cm) and rain (mm) falling in the current hour. */
  snowNow: number | null;
  rainNow: number | null;
  /** WMO weather code, visibility (m) and daylight for the current hour. */
  weatherCode: number | null;
  visibility: number | null;
  isDay: boolean | null;
  days: DayForecast[];
};

export type ResortForecast =
  { kind: "split"; base: PointForecast; summit: PointForecast } | { kind: "single"; point: PointForecast };

function pointsFor(resort: Resort): Point[] {
  const { lat, lon, baseElevation, topElevation } = resort;
  if (baseElevation === undefined || topElevation === undefined) return [{ lat, lon, elevation: NaN }];
  return [
    { lat, lon, elevation: baseElevation },
    { lat, lon, elevation: topElevation },
  ];
}

function buildUrl(points: Point[]): string {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lon).join(","),
    elevation: points.map((p) => (Number.isNaN(p.elevation) ? "nan" : p.elevation)).join(","),
    hourly: HOURLY.join(","),
    timezone: "auto",
    past_days: "7",
    // One day more than the outlook, so "next 7 days" can sum 168 hours from now.
    forecast_days: "8",
  });
  return `${API_URL}?${params}`;
}

function chunkByUrlLength(points: Point[]): Point[][] {
  const chunks: Point[][] = [];
  let current: Point[] = [];
  for (const point of points) {
    if (current.length > 0 && buildUrl([...current, point]).length > MAX_URL_LENGTH) {
      chunks.push(current);
      current = [];
    }
    current.push(point);
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function fetchPoints(points: Point[]): Promise<ApiLocation[]> {
  const res = await fetch(buildUrl(points));
  const json = (await res.json()) as ApiLocation | ApiLocation[] | { error: true; reason: string };
  if ("error" in json) throw new Error(`Open-Meteo: ${json.reason}`);
  if (!res.ok) throw new Error(`Open-Meteo: ${res.status} ${res.statusText}`);
  // A single location comes back as an object, several as an array.
  return Array.isArray(json) ? json : [json];
}

/** Sum of values[from, to); null if the range is out of bounds or has any missing value. */
function sum(values: Series, from: number, to: number): number | null {
  if (from < 0 || to > values.length) return null;
  let total = 0;
  for (let i = from; i < to; i++) {
    const v = values[i];
    if (v === null || v === undefined) return null;
    total += v;
  }
  return total;
}

/** Daily snowfall and temperature range from today onwards, from the hourly series. */
function dailyFromHourly(hourly: ApiLocation["hourly"], today: string): DayForecast[] {
  const dates = [...new Set(hourly.time.map((t) => t.slice(0, 10)))].filter((d) => d >= today);
  return dates.map((date) => {
    const from = hourly.time.findIndex((t) => t.startsWith(date));
    const temps = hourly.temperature_2m.slice(from, from + 24).filter((v): v is number => v !== null);
    return {
      date,
      snowfall: sum(hourly.snowfall, from, from + 24),
      tempMax: temps.length ? Math.max(...temps) : null,
      tempMin: temps.length ? Math.min(...temps) : null,
    };
  });
}

function summarize(loc: ApiLocation): PointForecast {
  const { hourly } = loc;
  // Times are local to the resort (timezone=auto), formatted like "2026-10-31T14:00".
  const localNow = new Date(Date.now() + loc.utc_offset_seconds * 1000).toISOString();
  const now = hourly.time.findIndex((t) => t.startsWith(localNow.slice(0, 13)));
  const at = (series: Series) => (now === -1 ? null : (series[now] ?? null));

  const days = dailyFromHourly(hourly, localNow.slice(0, 10)).slice(0, 7);
  const depth = at(hourly.snow_depth);
  const isDay = at(hourly.is_day);

  // Hourly snowfall at time t is the total for the preceding hour, so "now" closes the last 24h.
  return {
    elevation: loc.elevation,
    last24h: now === -1 ? null : sum(hourly.snowfall, now - 23, now + 1),
    last7d: now === -1 ? null : sum(hourly.snowfall, now - 167, now + 1),
    next24h: now === -1 ? null : sum(hourly.snowfall, now + 1, now + 25),
    next72h: now === -1 ? null : sum(hourly.snowfall, now + 1, now + 73),
    // From now, not from midnight, so snow that already fell today doesn't count as forecast.
    next7d: now === -1 ? null : sum(hourly.snowfall, now + 1, now + 169),
    snowDepth: depth === null ? null : depth * 100,
    temperature: at(hourly.temperature_2m),
    freezingLevel: at(hourly.freezing_level_height),
    windSpeed: at(hourly.wind_speed_10m),
    windGusts: at(hourly.wind_gusts_10m),
    // The value at now + 1 covers the hour in progress (each value is the total for the hour before it).
    snowNow: now === -1 ? null : (hourly.snowfall[now + 1] ?? null),
    rainNow: now === -1 ? null : (hourly.rain[now + 1] ?? null),
    weatherCode: at(hourly.weather_code),
    visibility: at(hourly.visibility),
    isDay: isDay === null ? null : isDay === 1,
    days,
  };
}

/** Fetches forecasts for the given resorts in as few requests as possible, keyed by resort id. */
export async function fetchForecasts(resorts: Resort[]): Promise<Record<string, ResortForecast>> {
  const perResort = resorts.map(pointsFor);
  const chunks = chunkByUrlLength(perResort.flat());
  const locations = (await Promise.all(chunks.map(fetchPoints))).flat().map(summarize);

  const result: Record<string, ResortForecast> = {};
  let i = 0;
  resorts.forEach((resort, r) => {
    result[resort.id] =
      perResort[r].length === 2
        ? { kind: "split", base: locations[i], summit: locations[i + 1] }
        : { kind: "single", point: locations[i] };
    i += perResort[r].length;
  });
  return result;
}

/** Minimums that count as "falling now": 0.1 cm of snow or 0.1 mm of rain in the hour. */
const SNOW_NOW_CM = 0.1;
const RAIN_NOW_MM = 0.1;

export type Precipitation = "snow" | "rain" | "mixed" | "dry";

// WMO codes: 71–77 and 85–86 snow; 51–67, 80–82 and 95–99 drizzle, rain or thunderstorms.
const snowCode = (c: number) => (c >= 71 && c <= 77) || c === 85 || c === 86;
const rainCode = (c: number) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;

/** Falling now if either the hour's amount passes the minimum or the weather code says so. */
export function precipitationNow(p: PointForecast): Precipitation | null {
  if (p.snowNow === null && p.rainNow === null && p.weatherCode === null) return null;
  const code = p.weatherCode ?? 0;
  const snowing = (p.snowNow ?? 0) >= SNOW_NOW_CM || snowCode(code);
  const raining = (p.rainNow ?? 0) >= RAIN_NOW_MM || rainCode(code);
  return snowing && raining ? "mixed" : snowing ? "snow" : raining ? "rain" : "dry";
}

/** 10 cm or more of new snow in the last 24 hours. */
export const POWDER_CM = 10;
export const isPowder = (p: PointForecast) => (p.last24h ?? 0) >= POWDER_CM;

/** Below this visibility, conditions count as low visibility (fog or heavy snow). */
const LOW_VISIBILITY_M = 1000;

export type Sky = "clear" | "mostly-clear" | "partly-cloudy" | "overcast" | "fog";

/** Sky from the WMO weather code (0 clear, 1–3 increasing cloud, 45/48 fog; precipitation implies overcast). */
export function skyNow(p: PointForecast): Sky | null {
  if (p.weatherCode === null) return null;
  if (p.weatherCode === 45 || p.weatherCode === 48) return "fog";
  if (p.visibility !== null && p.visibility < LOW_VISIBILITY_M) return "fog";
  return (["clear", "mostly-clear", "partly-cloudy"] as const)[p.weatherCode] ?? "overcast";
}

/** Windy enough to draw streaks: 30 km/h sustained or 45 km/h gusts. */
const WINDY_KMH = 30;
const WINDY_GUST_KMH = 45;
/** Gusts at which many lifts start slowing or closing. */
export const HIGH_WIND_GUST_KMH = 60;

export type Wind = "calm" | "windy" | "high";

export function windNow(p: PointForecast): Wind | null {
  if (p.windSpeed === null && p.windGusts === null) return null;
  if ((p.windGusts ?? 0) >= HIGH_WIND_GUST_KMH) return "high";
  if ((p.windSpeed ?? 0) >= WINDY_KMH || (p.windGusts ?? 0) >= WINDY_GUST_KMH) return "windy";
  return "calm";
}
