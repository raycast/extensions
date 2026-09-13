// Moon phase and rise/set times, computed locally with suncalc. Pure module.

import * as SunCalc from "suncalc";

export interface MoonInfo {
  /** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. */
  phase: number;
  /** Illuminated fraction 0..1. */
  illumination: number;
  phaseName: string;
  /** Local times, undefined when the moon doesn't rise/set that day. */
  moonrise?: Date;
  moonset?: Date;
}

const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

function phaseName(phase: number): string {
  // Centre each of the 8 named phases on its exact point in the cycle.
  const idx = Math.round(phase * 8) % 8;
  return PHASE_NAMES[idx];
}

const HOUR_MS = 3_600_000;
const EARTH_RADIUS_KM = 6378.14;

/**
 * Height of the moon's upper limb above the horizon in degrees, matching the
 * rise/set definition suncalc uses internally (`getMoonPosition` already
 * includes refraction and parallax).
 */
function moonHeight(ms: number, latitude: number, longitude: number): number {
  const p = SunCalc.getMoonPosition(new Date(ms), latitude, longitude);
  return p.altitude + (0.2725 * Math.asin(EARTH_RADIUS_KM / p.distance) * 180) / Math.PI + 0.09;
}

/** Start of the calendar day containing `date` in a fixed-offset zone (or the machine's zone). */
function dayStart(date: Date, utcOffsetSeconds: number | undefined): number {
  if (utcOffsetSeconds === undefined) return new Date(date).setHours(0, 0, 0, 0);
  const shifted = new Date(date.getTime() + utcOffsetSeconds * 1000);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - utcOffsetSeconds * 1000;
}

/**
 * Moonrise/moonset within the 24h starting at `start`. suncalc's own
 * `getMoonTimes` only searches the UTC day, so this samples the moon's height
 * hourly over the place's day and bisects the horizon crossings.
 */
function moonTimes(start: number, latitude: number, longitude: number): { rise?: Date; set?: Date } {
  const alt = (ms: number) => moonHeight(ms, latitude, longitude);
  const bisect = (lo: number, hi: number, rising: boolean) => {
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (alt(mid) >= 0 === rising) hi = mid;
      else lo = mid;
    }
    return new Date((lo + hi) / 2);
  };
  let rise: Date | undefined;
  let set: Date | undefined;
  let prev = alt(start);
  for (let h = 1; h <= 24 && !(rise && set); h++) {
    const t = start + h * HOUR_MS;
    const cur = alt(t);
    if (!rise && prev < 0 && cur >= 0) rise = bisect(t - HOUR_MS, t, true);
    else if (!set && prev >= 0 && cur < 0) set = bisect(t - HOUR_MS, t, false);
    prev = cur;
  }
  return { rise, set };
}

/**
 * Moon phase plus rise/set for the place's current day. Pass the forecast's
 * `utc_offset_seconds` so "today" and the printed clock are the place's, not
 * the machine's; without it the machine's zone is used.
 */
export function moonInfo(date: Date, latitude: number, longitude: number, utcOffsetSeconds?: number): MoonInfo {
  const ill = SunCalc.getMoonIllumination(date);
  const times = moonTimes(dayStart(date, utcOffsetSeconds), latitude, longitude);
  return {
    phase: ill.phase,
    illumination: ill.fraction,
    phaseName: phaseName(ill.phase),
    moonrise: times.rise,
    moonset: times.set,
  };
}

/** HH:MM in a fixed-offset zone, or the machine's zone when no offset is given. */
export function formatClock(d: Date, utcOffsetSeconds?: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  if (utcOffsetSeconds === undefined) return `${p(d.getHours())}:${p(d.getMinutes())}`;
  const shifted = new Date(d.getTime() + utcOffsetSeconds * 1000);
  return `${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}`;
}
