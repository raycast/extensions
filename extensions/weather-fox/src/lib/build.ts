// Builders that turn forecast data into renderer options. Pure module, shared
// by the list view, the Today view, and the share-image feature.

import { Forecast, GeoResult, fmt, formatPlace, formatPrecip } from "./api";
import { moonInfo } from "./astro";
import { glyphFor, labelFor } from "./palettes";
import { HeroOptions, HeroChartPoint, NowcastStep, StripHour } from "./svg";
import { ThemeId, styleFor } from "./themes";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isoToDate(iso: string): Date {
  // Open-Meteo returns wall-clock time in the location's timezone; parse the parts directly.
  return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

export function hourOf(iso: string): number {
  return Number(iso.slice(11, 13));
}

export function friendlyDate(iso: string, withTime: boolean): string {
  const d = isoToDate(iso);
  const base = `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return withTime ? `${base} · ${iso.slice(11, 16)}` : base;
}

/** HH:MM from an ISO wall-clock string; "—" when Open-Meteo has no value (polar day/night). */
export function timeOf(iso: string | null | undefined): string {
  return typeof iso === "string" && iso.length >= 16 ? iso.slice(11, 16) : "—";
}

/**
 * The place's live wall-clock time as an ISO-like string, computed from the
 * forecast's UTC offset. Unlike `current.time` (the observation timestamp,
 * rounded to 15 minutes and possibly stale from cache), this is always "now"
 * in the location's timezone.
 */
export function placeLocalIso(forecast: Forecast): string {
  const d = new Date(Date.now() + forecast.utc_offset_seconds * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function dayName(forecast: Forecast, d: number): string {
  return d === 0 ? "Today" : d === 1 ? "Tomorrow" : WEEKDAYS[isoToDate(forecast.daily.time[d]).getDay()];
}

/**
 * Index into the hourly arrays matching the current hour. Looks up the place's
 * live clock first so a cached response still lines up with "now"; falls back
 * to the observation time, then clamps to the ends of the array.
 */
export function nowHourIndex(forecast: Forecast): number {
  const times = forecast.hourly.time;
  const byPrefix = (iso: string) => {
    const prefix = iso.slice(0, 13);
    return times.findIndex((t) => t.slice(0, 13) === prefix);
  };
  const idx = byPrefix(placeLocalIso(forecast));
  if (idx !== -1) return idx;
  const fallback = byPrefix(forecast.current.time);
  if (fallback !== -1) return fallback;
  // Response is entirely in the past or future relative to now.
  return placeLocalIso(forecast) > (times[times.length - 1] ?? "") ? Math.max(times.length - 1, 0) : 0;
}

/** Hero options for the current conditions (24h chart from now). */
export function nowHero(forecast: Forecast, place: GeoResult, theme: ThemeId, unitSymbol: string): HeroOptions {
  const cur = forecast.current;
  const isDay = cur.is_day === 1;
  const startIdx = nowHourIndex(forecast);

  const chart: HeroChartPoint[] = forecast.hourly.time.slice(startIdx, startIdx + 24).map((t, i) => ({
    label: i === 0 ? "Now" : `${hourOf(t)}h`,
    temp: forecast.hourly.temperature_2m[startIdx + i],
  }));

  const glyph = glyphFor(cur.weather_code, isDay);
  return {
    place: formatPlace(place),
    dateLine: friendlyDate(placeLocalIso(forecast), true),
    temperature: cur.temperature_2m,
    subline: `Feels like ${fmt(cur.apparent_temperature, "°")}  ·  H ${fmt(forecast.daily.temperature_2m_max[0], "°")}  L ${fmt(forecast.daily.temperature_2m_min[0], "°")}`,
    conditionLabel: labelFor(cur.weather_code),
    unitSymbol,
    glyph,
    style: styleFor(theme, cur.weather_code, isDay),
    chart,
    nowIndex: 0,
    moonPhase: glyph === "moon" ? moonInfo(new Date(), place.latitude, place.longitude).phase : undefined,
  };
}

/** Hero options for a forecast day (that day's 24 hourly temps). */
export function dayHero(
  forecast: Forecast,
  d: number,
  place: GeoResult,
  theme: ThemeId,
  unitSymbol: string,
): HeroOptions {
  const daily = forecast.daily;
  const code = daily.weather_code[d];
  const start = d * 24;

  const chart: HeroChartPoint[] = forecast.hourly.time.slice(start, start + 24).map((t, i) => ({
    label: `${hourOf(t)}h`,
    temp: forecast.hourly.temperature_2m[start + i],
  }));

  return {
    place: formatPlace(place),
    dateLine: friendlyDate(daily.time[d], false),
    temperature: daily.temperature_2m_max[d],
    subline: `Low ${fmt(daily.temperature_2m_min[d], "°")}  ·  Rain ${fmt(daily.precipitation_probability_max[d], "%")}  ·  UV ${fmt(daily.uv_index_max[d])}`,
    conditionLabel: labelFor(code),
    unitSymbol,
    glyph: glyphFor(code, true),
    style: styleFor(theme, code, true),
    chart,
    nowIndex: -1,
  };
}

function stripHour(forecast: Forecast, idx: number, label: string): StripHour {
  const precip = forecast.hourly.precipitation?.[idx];
  return {
    label,
    temp: forecast.hourly.temperature_2m[idx],
    glyph: glyphFor(forecast.hourly.weather_code[idx], forecast.hourly.is_day[idx] === 1),
    precip,
    precipText: typeof precip === "number" ? formatPrecip(precip, forecast.units) : undefined,
  };
}

/** Strip data for the next `count` hours from now. */
export function nextHours(forecast: Forecast, count: number): StripHour[] {
  const startIdx = nowHourIndex(forecast);
  return forecast.hourly.time
    .slice(startIdx, startIdx + count)
    .map((t, i) => stripHour(forecast, startIdx + i, i === 0 ? "Now" : `${hourOf(t)}h`))
    .filter((h) => Number.isFinite(h.temp));
}

/** Strip data for daytime hours (8:00–17:00) of a forecast day. */
export function dayHours(forecast: Forecast, d: number): StripHour[] {
  const start = d * 24 + 8;
  return forecast.hourly.time
    .slice(start, start + 10)
    .map((t, i) => stripHour(forecast, start + i, `${hourOf(t)}h`))
    .filter((h) => Number.isFinite(h.temp));
}

/** 15-minute precipitation steps for the nowcast chart. */
export function nowcastSteps(forecast: Forecast): NowcastStep[] {
  const m = forecast.minutely_15;
  if (!m || m.time.length === 0) return [];
  return m.time.map((t, i) => ({ label: timeOf(t), mm: m.precipitation[i] ?? 0 }));
}

/** One-line answer to "will it rain soon?", from 15-minute data. */
export function nowcastSummary(forecast: Forecast): string | undefined {
  const steps = nowcastSteps(forecast);
  if (steps.length === 0) return undefined;
  const wet = (mm: number) => mm >= 0.1;
  const horizon = Math.round((steps.length * 15) / 60);
  const firstWet = steps.findIndex((s) => wet(s.mm));
  if (firstWet === -1) return `No rain expected in the next ${horizon} hours`;
  if (firstWet === 0) {
    const firstDry = steps.findIndex((s) => !wet(s.mm));
    if (firstDry === -1) return `Rain continuing for the next ${horizon} hours`;
    return `Rain stopping around ${steps[firstDry].label}`;
  }
  return `Rain starting around ${steps[firstWet].label}`;
}

/** e.g. "3° warmer than yesterday". Undefined when history is unavailable. */
export function yesterdayComparison(forecast: Forecast): string | undefined {
  const y = forecast.yesterday;
  if (!y || y.temperature_2m.length < 24) return undefined;
  const hour = hourOf(forecast.current.time);
  const now = forecast.current.temperature_2m;
  const then = y.temperature_2m[hour];
  if (!Number.isFinite(now) || !Number.isFinite(then)) return undefined;
  const rounded = Math.round(now - then);
  if (Math.abs(rounded) < 1) return "About the same as yesterday";
  return `${Math.abs(rounded)}° ${rounded > 0 ? "warmer" : "colder"} than yesterday`;
}
