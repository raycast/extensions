export interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  /** ISO 3166 code from the geocoder, e.g. "US". Used to gate NWS alerts. */
  country_code?: string;
  admin1?: string;
  /** County/district level, e.g. "San Francisco County". */
  admin2?: string;
  /** Municipality level, e.g. "City of Westminster". */
  admin3?: string;
  /** Postal codes associated with the place; the geocoder also matches queries against them. */
  postcodes?: string[];
  timezone?: string;
}

export interface CurrentWeather {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  surface_pressure: number;
  cloud_cover: number;
  uv_index: number;
}

export interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  snowfall: number[];
  weather_code: number[];
  is_day: number[];
}

export interface DailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  sunrise: string[];
  sunset: string[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
  snowfall_sum: number[];
  uv_index_max: number[];
  wind_speed_10m_max: number[];
}

/** 15-minute precipitation steps starting at the current quarter-hour. */
export interface MinutelyWeather {
  time: string[];
  precipitation: number[];
}

export interface YesterdaySummary {
  /** 24 hourly temperatures for yesterday, index = hour of day. */
  temperature_2m: number[];
  max: number;
  min: number;
}

export type Units = "celsius" | "fahrenheit";

/**
 * Temperatures and wind speeds are in the requested unit system (see
 * `units`). Precipitation is always metric — rain in mm, snow in cm — so the
 * "is it raining" thresholds throughout the app have one meaning; convert for
 * display with formatPrecip / formatSnow.
 */
export interface Forecast {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  current: CurrentWeather;
  hourly: HourlyWeather;
  daily: DailyWeather;
  minutely_15?: MinutelyWeather;
  /** Split off from the raw response by normalizeForecast. */
  yesterday?: YesterdaySummary;
  /** Unit system the temperatures and wind speeds were fetched in; set by normalizeForecast. */
  units: Units;
}

/**
 * The geocoder matches whole place names (cities, neighborhoods, postal
 * codes) but not comma-qualified queries, so only the part before the first
 * comma is sent; the rest becomes client-side filters (see filterGeoResults).
 */
/** The part of a query that is sent to the geocoder (before the first comma). */
export function geocodeName(query: string): string {
  return query.split(",")[0].trim();
}

export function geocodeUrl(query: string): string {
  const hasQualifiers = query.includes(",");
  const params = new URLSearchParams({
    name: geocodeName(query),
    // Results are population-ranked, so small places (neighborhoods) sit deep
    // in the list; qualified queries fetch wide and rely on client filtering.
    count: hasQualifiers ? "100" : "10",
    language: "en",
    format: "json",
  });
  return `https://geocoding-api.open-meteo.com/v1/search?${params}`;
}

/**
 * Narrow results using the comma-separated qualifiers the user typed, e.g.
 * "noe valley, san francisco, california" keeps results whose region fields
 * match "san francisco" and "california".
 */
export function filterGeoResults(results: GeoResult[], query: string): GeoResult[] {
  const qualifiers = query
    .split(",")
    .slice(1)
    .map((q) => q.trim().toLowerCase())
    .filter((q) => q.length > 0);
  if (qualifiers.length === 0) return results;
  return results.filter((r) => {
    const haystack = [r.admin1, r.admin2, r.admin3, r.country, r.country_code, ...(r.postcodes ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return qualifiers.every((q) => haystack.includes(q));
  });
}

export function forecastUrl(latitude: number, longitude: number, units: Units, days: number = 7): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    temperature_unit: units,
    wind_speed_unit: units === "celsius" ? "kmh" : "mph",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "surface_pressure",
      "cloud_cover",
      "uv_index",
    ].join(","),
    hourly: ["temperature_2m", "precipitation_probability", "precipitation", "snowfall", "weather_code", "is_day"].join(
      ",",
    ),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "precipitation_probability_max",
      "precipitation_sum",
      "snowfall_sum",
      "uv_index_max",
      "wind_speed_10m_max",
    ].join(","),
    minutely_15: "precipitation",
    forecast_minutely_15: "12",
    timezone: "auto",
    forecast_days: String(days),
    // One day of history so the UI can say "warmer/colder than yesterday".
    past_days: "1",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/**
 * The raw response includes yesterday (past_days=1) at the front of every
 * array. Split it off into `yesterday` so day/hour indexing in the rest of
 * the app stays zero-based on today.
 */
export function normalizeForecast(raw: Omit<Forecast, "units">, units: Units): Forecast {
  if (
    !raw?.current ||
    !Array.isArray(raw.hourly?.time) ||
    !Array.isArray(raw.daily?.time) ||
    raw.daily.time.length < 2
  ) {
    throw new Error("Forecast response is incomplete");
  }
  const hourly = { ...raw.hourly };
  const daily = { ...raw.daily };
  const yesterdayTemps = raw.hourly.temperature_2m.slice(0, 24);
  const yesterday: YesterdaySummary = {
    temperature_2m: yesterdayTemps,
    max: raw.daily.temperature_2m_max[0],
    min: raw.daily.temperature_2m_min[0],
  };
  for (const key of Object.keys(hourly) as (keyof HourlyWeather)[]) {
    hourly[key] = hourly[key].slice(24) as never;
  }
  for (const key of Object.keys(daily) as (keyof DailyWeather)[]) {
    daily[key] = daily[key].slice(1) as never;
  }
  return { ...raw, hourly, daily, yesterday, units };
}

export interface AirQualityCurrent {
  time: string;
  us_aqi: number | null;
  european_aqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  alder_pollen: number | null;
  birch_pollen: number | null;
  grass_pollen: number | null;
  mugwort_pollen: number | null;
  olive_pollen: number | null;
  ragweed_pollen: number | null;
}

export interface AirQuality {
  current: AirQualityCurrent;
}

export function airQualityUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      "us_aqi",
      "european_aqi",
      "pm2_5",
      "pm10",
      "alder_pollen",
      "birch_pollen",
      "grass_pollen",
      "mugwort_pollen",
      "olive_pollen",
      "ragweed_pollen",
    ].join(","),
    timezone: "auto",
  });
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
}

/** US AQI bands per EPA. */
export function usAqiInfo(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "#3fb950" };
  if (aqi <= 100) return { label: "Moderate", color: "#d4a72c" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "#e8833a" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#e5534b" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "#a371f7" };
  return { label: "Hazardous", color: "#8b2e3c" };
}

/** Pollen bands (grains/m³) are plant-specific; this is a rough shared scale. */
function pollenLevel(grains: number): string {
  if (grains < 10) return "Low";
  if (grains < 50) return "Moderate";
  if (grains < 150) return "High";
  return "Very High";
}

/** e.g. "Grass High · Birch Low" for the pollens currently in the air (Europe only). */
export function pollenSummary(airQuality: AirQuality | undefined): string | undefined {
  if (!airQuality) return undefined;
  const c = airQuality.current;
  const kinds: [string, number | null][] = [
    ["Grass", c.grass_pollen],
    ["Birch", c.birch_pollen],
    ["Alder", c.alder_pollen],
    ["Mugwort", c.mugwort_pollen],
    ["Olive", c.olive_pollen],
    ["Ragweed", c.ragweed_pollen],
  ];
  const active = kinds
    .filter((k): k is [string, number] => k[1] != null && k[1] >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (active.length === 0) return undefined;
  return active.map(([name, v]) => `${name} ${pollenLevel(v)}`).join(" · ");
}

export interface NwsAlert {
  id: string;
  properties: {
    event: string;
    headline: string | null;
    severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
    urgency: string;
    ends: string | null;
    expires: string | null;
    areaDesc: string;
    description: string;
    instruction: string | null;
  };
}

export interface NwsAlertResponse {
  features: NwsAlert[];
}

/** Active severe-weather alerts from the US National Weather Service (US only). */
export function nwsAlertsUrl(latitude: number, longitude: number): string {
  return `https://api.weather.gov/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export function formatPlace(geo: GeoResult): string {
  return [geo.name, geo.admin1, geo.country].filter(Boolean).join(", ");
}

export function degreesToCompass(deg: number): string {
  if (!Number.isFinite(deg)) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[((Math.round(deg / 22.5) % 16) + 16) % 16];
}

/**
 * Open-Meteo reports unavailable values as null (e.g. UV and rain probability
 * beyond the model horizon in 16-day mode), and the types above say `number`
 * for convenience. Format through here so those render as "—" rather than
 * "null%" or "NaN°".
 */
export function fmt(value: number | null | undefined, suffix = "", round = true): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${round ? Math.round(value) : value}${suffix}`;
}

/** Rain amount for display. Data is always mm; Imperial users see inches (0.1 mm ≈ 0.004 in, hence two decimals). */
export function formatPrecip(mm: number | null | undefined, units: Units): string {
  if (typeof mm !== "number" || !Number.isFinite(mm)) return "—";
  return units === "celsius" ? `${mm.toFixed(1)} mm` : `${(mm / 25.4).toFixed(2)} in`;
}

/** Snowfall amount for display. Data is always cm; Imperial users see inches. */
export function formatSnow(cm: number | null | undefined, units: Units): string {
  if (typeof cm !== "number" || !Number.isFinite(cm)) return "—";
  return units === "celsius" ? `${cm.toFixed(1)} cm` : `${(cm / 2.54).toFixed(1)} in`;
}
