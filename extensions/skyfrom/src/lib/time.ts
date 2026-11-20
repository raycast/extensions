import { getTimes } from "suncalc";

export const presets = ["sunrise", "noon", "sunset", "midnight", "goldenHour"] as const;
export type Preset = (typeof presets)[number];
export const timeLabels: Record<Preset, string> = {
  sunrise: "Sunrise",
  noon: "Noon",
  sunset: "Sunset",
  midnight: "Midnight",
  goldenHour: "Golden Hour",
};

export type SkyTime =
  { kind: "now" } | { kind: "fixed"; local: string } | { kind: "preset"; event: Preset; date?: string };

export const now: SkyTime = { kind: "now" };

export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00Z");
  return Number.isFinite(+parsed) && parsed.toISOString().startsWith(value);
}

export function isLocalTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) &&
    isDate(value.slice(0, 10))
  );
}

export function localMinute(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`;
}

export function resolveTime(time: SkyTime, city: { name: string; tz: string; lat: number; lon: number }) {
  if (time.kind === "now") return undefined;
  if (time.kind === "fixed") return time.local;
  const date = time.date ?? localMinute(new Date(), city.tz).slice(0, 10);
  if (time.event === "noon") return date + "T12:00";
  if (time.event === "midnight") return date + "T00:00";

  const utcNoon = Date.parse(date + "T12:00Z");
  // A local calendar date can straddle two UTC dates, especially near the date line.
  for (const delta of [0, -86_400_000, 86_400_000]) {
    const event = getTimes(new Date(utcNoon + delta), city.lat, city.lon)[time.event];
    if (!event || !Number.isFinite(+event)) continue;
    const local = localMinute(event, city.tz);
    if (local.startsWith(date)) return local;
  }
  throw new Error(`${timeLabels[time.event]} does not occur in ${city.name} on ${date}. Choose another date or time.`);
}

export function timeLabel(time: SkyTime): string {
  if (time.kind === "now") return "Now";
  if (time.kind === "fixed") return time.local.replace("T", " · ");
  return time.date ? `${timeLabels[time.event]} · ${time.date}` : `${timeLabels[time.event]} today`;
}
