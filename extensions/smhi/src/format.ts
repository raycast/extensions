import type { SmhiTimeEntry } from "./smhi";

// Why: SMHI coverage is the Nordics, so the audience reads local time.
// Hardcoding avoids dragging in a tz library and is correct for the target audience.
export const DISPLAY_TZ = "Europe/Stockholm";

// Why: SMHI's own UI uses Swedish locale conventions (comma decimal separator). Numbers in the
// extension follow the same convention so they read naturally to the Nordic audience.
const NUMBER_LOCALE = "sv-SE";

export function formatDecimal(n: number, decimals: number = 1): string {
  return roundedWithoutNegativeZero(n, decimals).toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Rounding a small negative number leaves a signed zero, and the formatter spells that out:
// -0.4 °C becomes "−0°" and -0.04 °C becomes "−0,0 °C", both of which read as a glitch. Adding
// zero collapses -0 back to 0. Hovering either side of freezing is the normal state of a Nordic
// forecast, so this is a common case rather than a corner one.
function roundedWithoutNegativeZero(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor + 0;
}

// Whole numbers with no thousands separator: sv-SE would group 1034 hPa as "1 034 hPa".
export function formatInteger(n: number): string {
  return n.toLocaleString(NUMBER_LOCALE, { maximumFractionDigits: 0, useGrouping: false });
}

// Routed through the locale formatter rather than a template so a sub-zero temperature gets the
// same U+2212 minus as the detail pane, instead of an ASCII hyphen: "−6°", not "-6°".
export function formatTemp(c: number): string {
  return `${formatDecimal(c, 0)}°`;
}

// Full-precision temperature with unit, for the detail pane. Uses the same comma decimal as every
// other number in the extension, since `toFixed` would render a dot and break the convention.
export function formatTempExact(c: number): string {
  return `${formatDecimal(c)} °C`;
}

// English compass abbreviations and corresponding arrows. The rest of the UI is in English, and
// Swedish "O" (öster/east) is read as "west" by an English audience.
// Convention: index 0 = wind FROM north → blowing south (arrow ↓); each step is 45°.
const COMPASS_8 = [
  { label: "N", arrow: "↓" },
  { label: "NE", arrow: "↙" },
  { label: "E", arrow: "←" },
  { label: "SE", arrow: "↖" },
  { label: "S", arrow: "↑" },
  { label: "SW", arrow: "↗" },
  { label: "W", arrow: "→" },
  { label: "NW", arrow: "↘" },
] as const satisfies ReadonlyArray<{ label: string; arrow: string }>;

export function formatWind(speedMs: number, fromDegrees: number, gustMs?: number): string {
  const { label, arrow } = COMPASS_8[Math.round(fromDegrees / 45) % 8];
  const speed = Math.round(speedMs);
  const gust = gustMs !== undefined ? ` (${Math.round(gustMs)})` : "";
  return `${label} ${arrow} ${speed}${gust}`;
}

// Compact precipitation amount string used in row accessories: comma decimal, minus-sign range,
// no `mm` suffix (the accompanying probability pill makes the column's meaning unambiguous).
// SMHI shows the range from the ensemble's min to max.
export function formatPrecipAmount(minMm: number, maxMm: number): string {
  if (maxMm < 0.05) return "0";
  const minStr = minMm < 0.05 ? "0" : formatDecimal(minMm);
  const maxStr = formatDecimal(maxMm);
  return Math.abs(maxMm - minMm) < 0.05 ? maxStr : `${minStr} − ${maxStr}`;
}

// Verbose precipitation string used in the detail-pane markdown table where the `mm` unit and
// probability are useful since there's no surrounding column header.
export function formatPrecip(mm: number, probability: number): string {
  if (mm < 0.05 && probability < 5) return "−";
  return `${formatDecimal(mm)} mm · ${Math.round(probability)}%`;
}

// Australian BoM Apparent Temperature, which works year-round (cold wind-chill and hot-humid).
// Inputs: air temp °C, wind speed m/s at 10 m, relative humidity %. Output: °C.
// https://www.bom.gov.au/info/thermal_stress/#atapproximation
export function feelsLike(tempC: number, windMs: number, humidityPct: number): number {
  const vapourPressure = (humidityPct / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  return tempC + 0.33 * vapourPressure - 0.7 * windMs - 4;
}

export function formatTime(iso: string, timeZone: string = DISPLAY_TZ): string {
  return new Date(iso).toLocaleTimeString(NUMBER_LOCALE, { hour: "2-digit", minute: "2-digit", timeZone });
}

// Same clock time with the zone spelled out ("01:00 CEST"), so a reader outside the Nordics knows
// which wall clock the forecast is on without a separate row for it.
export function formatTimeZoned(iso: string, timeZone: string = DISPLAY_TZ): string {
  return new Date(iso).toLocaleTimeString(NUMBER_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  });
}

// Hour-only time, used for row titles where the entry is always on the hour and SMHI shows
// just "16" rather than "16:00".
export function formatHour(iso: string, timeZone: string = DISPLAY_TZ): string {
  return new Date(iso).toLocaleTimeString(NUMBER_LOCALE, { hour: "2-digit", timeZone });
}

export function formatDay(iso: string, timeZone: string = DISPLAY_TZ): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

// Local-date key (YYYY-MM-DD in the display tz). Used to bucket entries by day.
function localDateKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

function localHour(iso: string, timeZone: string): number {
  const hourStr = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(iso));
  return Number(hourStr);
}

export function bucketByDay(entries: SmhiTimeEntry[], timeZone: string = DISPLAY_TZ): Map<string, SmhiTimeEntry[]> {
  const buckets = new Map<string, SmhiTimeEntry[]>();
  for (const entry of entries) {
    const key = localDateKey(entry.time, timeZone);
    const list = buckets.get(key);
    if (list) list.push(entry);
    else buckets.set(key, [entry]);
  }
  return buckets;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD in display tz
  representativeTime: string; // ISO of the entry used for the symbol; picks closest to local noon
  minTemp: number;
  maxTemp: number;
  symbolCode: number;
  precipMinMm: number; // Lowest min across the day's entries
  precipMaxMm: number; // Highest max across the day's entries
  maxPrecipProb: number;
  entries: SmhiTimeEntry[]; // Raw entries that produced this summary (for the detail-pane interval table).
}

export function dailySummary(date: string, entries: SmhiTimeEntry[], timeZone: string = DISPLAY_TZ): DailySummary {
  let min = Infinity;
  let max = -Infinity;
  let precipMinMm = Infinity;
  let precipMaxMm = 0;
  let maxPrecipProb = 0;
  let bestSymbolEntry = entries[0];
  let bestDistanceToNoon = Infinity;
  for (const entry of entries) {
    const t = entry.data.air_temperature;
    if (t < min) min = t;
    if (t > max) max = t;
    if (entry.data.precipitation_amount_min < precipMinMm) precipMinMm = entry.data.precipitation_amount_min;
    if (entry.data.precipitation_amount_max > precipMaxMm) precipMaxMm = entry.data.precipitation_amount_max;
    if (entry.data.probability_of_precipitation > maxPrecipProb) {
      maxPrecipProb = entry.data.probability_of_precipitation;
    }
    const distance = Math.abs(localHour(entry.time, timeZone) - 12);
    if (distance < bestDistanceToNoon) {
      bestDistanceToNoon = distance;
      bestSymbolEntry = entry;
    }
  }
  return {
    date,
    representativeTime: bestSymbolEntry.time,
    minTemp: min,
    maxTemp: max,
    symbolCode: bestSymbolEntry.data.symbol_code,
    precipMinMm: precipMinMm === Infinity ? 0 : precipMinMm,
    precipMaxMm,
    maxPrecipProb,
    entries,
  };
}

export function isSameLocalDay(isoA: string, isoB: string, timeZone: string = DISPLAY_TZ): boolean {
  return localDateKey(isoA, timeZone) === localDateKey(isoB, timeZone);
}

const HOUR_MS = 60 * 60 * 1000;

// Start of the wall-clock hour containing `at`. The forecast is hourly, so this is the earliest
// entry still worth showing, since a cached payload can otherwise surface an hour that has passed.
export function hourStart(at: Date = new Date()): number {
  return Math.floor(at.getTime() / HOUR_MS) * HOUR_MS;
}
