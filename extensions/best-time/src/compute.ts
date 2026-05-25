import { DAY_NAMES, Heatmap, Intensity, PLATFORMS, Platform } from "./heatmaps";

export type TimeFormat = "ampm" | "24h";

/** Hours to look ahead when finding the next picks. Fixed at one week. */
const LOOKAHEAD_HOURS = 24 * 7;

/**
 * A contiguous run of hours where intensity ≥ 2 ("good or better").
 * `intensity` is the max intensity inside the run (so a run containing any
 * `#` cell has intensity 3 — a "best window").
 */
export type Window = {
  platform: Platform;
  /** Inclusive hour-aligned start. */
  start: Date;
  /** Number of hours in the run (≥ 1). */
  hours: number;
  /** Max intensity inside the run: 2 = good window, 3 = best window. */
  intensity: 2 | 3;
};

export type PlatformPicks = {
  platform: Platform;
  /** Soonest `#` cell in the lookahead — the single exact peak hour. */
  bestHour: { when: Date } | null;
  /**
   * Next N intensity-≥2 windows in the lookahead in chronological order.
   * The window that contains `bestHour` is NOT excluded — if it falls within
   * the next N, it appears here too (intentional redundancy: title shows the
   * peak hour, chip shows the surrounding window).
   */
  windows: Window[];
};

/** JS getDay() returns 0=Sun..6=Sat. Convert to our 0=Mon..6=Sun index. */
export function jsToBufferDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function ceilToNextHour(now: Date): Date {
  const d = new Date(now);
  if (
    d.getMinutes() !== 0 ||
    d.getSeconds() !== 0 ||
    d.getMilliseconds() !== 0
  ) {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  } else {
    d.setSeconds(0, 0);
  }
  return d;
}

function* hoursAhead(start: Date, hours: number): Generator<Date> {
  for (let i = 0; i < hours; i++) {
    const d = new Date(start);
    d.setHours(d.getHours() + i, 0, 0, 0);
    yield d;
  }
}

export function lookupIntensity(heatmap: Heatmap, when: Date): Intensity {
  const day = jsToBufferDay(when.getDay());
  return heatmap[day][when.getHours()];
}

/** Walk hours forward from `now`, grouping consecutive intensity-≥2 cells into windows. */
function findWindows(
  platform: Platform,
  now: Date,
  horizonHours: number,
): Window[] {
  const walkStart = ceilToNextHour(now);
  const out: Window[] = [];

  let openStart: Date | null = null;
  let openMax: 0 | 2 | 3 = 0;
  let openHours = 0;

  const flush = () => {
    if (openStart !== null && (openMax === 2 || openMax === 3)) {
      out.push({
        platform,
        start: openStart,
        hours: openHours,
        intensity: openMax,
      });
    }
    openStart = null;
    openMax = 0;
    openHours = 0;
  };

  for (const when of hoursAhead(walkStart, horizonHours)) {
    const intensity = lookupIntensity(platform.heatmap, when);
    if (intensity >= 2) {
      if (openStart === null) openStart = when;
      if (intensity > openMax) openMax = intensity as 2 | 3;
      openHours++;
    } else {
      flush();
    }
  }
  flush();
  return out;
}

export function platformPicks(
  platform: Platform,
  now: Date,
  windowCount = 3,
): PlatformPicks {
  const walkStart = ceilToNextHour(now);

  // Soonest `#` cell — the exact peak hour.
  let bestHour: { when: Date } | null = null;
  for (const when of hoursAhead(walkStart, LOOKAHEAD_HOURS)) {
    if (lookupIntensity(platform.heatmap, when) === 3) {
      bestHour = { when };
      break;
    }
  }

  // Next N good-or-better windows in chronological order (no exclusion).
  const windows = findWindows(platform, now, LOOKAHEAD_HOURS).slice(
    0,
    windowCount,
  );

  return { platform, bestHour, windows };
}

export function allPlatformPicks(
  now: Date,
  platformIds?: string[],
  windowCount = 3,
): PlatformPicks[] {
  // If the user provided an explicit list, honour both inclusion AND order.
  // Unknown IDs are silently dropped.
  if (platformIds && platformIds.length > 0) {
    return platformIds
      .map((id) => PLATFORMS.find((p) => p.id === id))
      .filter((p): p is Platform => p !== undefined)
      .map((p) => platformPicks(p, now, windowCount));
  }

  // Default: every platform, sorted by soonest peak.
  return PLATFORMS.map((p) => platformPicks(p, now, windowCount)).sort(
    (a, b) => {
      const aMs =
        a.bestHour?.when.getTime() ??
        a.windows[0]?.start.getTime() ??
        Number.POSITIVE_INFINITY;
      const bMs =
        b.bestHour?.when.getTime() ??
        b.windows[0]?.start.getTime() ??
        Number.POSITIVE_INFINITY;
      return aMs - bMs;
    },
  );
}

export function formatRelative(now: Date, target: Date): string {
  const diffMs = target.getTime() - now.getTime();
  const totalMin = Math.max(0, Math.round(diffMs / 60000));
  if (totalMin < 1) return "now";
  if (totalMin < 60) return `in ${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) return mins === 0 ? `in ${hours}h` : `in ${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours === 0 ? `in ${days}d` : `in ${days}d ${remHours}h`;
}

function hour12(h: number): number {
  return h % 12 === 0 ? 12 : h % 12;
}
function ampmLong(h: number): "a.m." | "p.m." {
  return h < 12 ? "a.m." : "p.m.";
}
function ampmShort(h: number): "a" | "p" {
  return h < 12 ? "a" : "p";
}

/** Exact single hour. ampm: "Fri 3 p.m." · 24h: "Fri 15:00". */
export function formatExactHour(when: Date, fmt: TimeFormat = "ampm"): string {
  const day = DAY_NAMES[jsToBufferDay(when.getDay())];
  const h = when.getHours();
  if (fmt === "24h") return `${day} ${String(h).padStart(2, "0")}:00`;
  return `${day} ${hour12(h)} ${ampmLong(h)}`;
}

/**
 * Long form for the row title.
 *   ampm: "Fri 3 p.m." / "Fri 3–6 p.m." / "Sun 11 a.m.–1 p.m."
 *   24h:  "Fri 15:00"  / "Fri 15:00–18:00" / "Sun 11:00–13:00"
 */
export function formatWindow(w: Window, fmt: TimeFormat = "ampm"): string {
  const day = DAY_NAMES[jsToBufferDay(w.start.getDay())];
  const startH = w.start.getHours();
  const endH = startH + w.hours - 1;

  if (fmt === "24h") {
    const s = `${String(startH).padStart(2, "0")}:00`;
    if (w.hours === 1) return `${day} ${s}`;
    const e = `${String(endH).padStart(2, "0")}:00`;
    return `${day} ${s}–${e}`;
  }

  if (w.hours === 1) {
    return `${day} ${hour12(startH)} ${ampmLong(startH)}`;
  }
  if (ampmLong(startH) === ampmLong(endH)) {
    return `${day} ${hour12(startH)}–${hour12(endH)} ${ampmLong(endH)}`;
  }
  return `${day} ${hour12(startH)} ${ampmLong(startH)}–${hour12(endH)} ${ampmLong(endH)}`;
}

/**
 * Rewrite hardcoded a.m./p.m. references in a prose string so the time format
 * setting also reaches descriptive notes (e.g. "6–11 p.m." → "18:00–23:00").
 * No-op when the format is already ampm. Handles single times and ranges,
 * en-dash or hyphen, periods optional ("p.m." / "pm"), with or without space.
 */
export function reformatTimesInProse(prose: string, fmt: TimeFormat): string {
  if (fmt === "ampm") return prose;

  const to24 = (h: number, ap: string) => {
    const a = ap[0].toLowerCase();
    if (a === "a") return h === 12 ? 0 : h;
    return h === 12 ? 12 : h + 12;
  };
  const fmt00 = (h: number) => `${String(h).padStart(2, "0")}:00`;

  // Range first ("6–11 p.m."), then any leftover singles ("9 a.m.").
  let out = prose.replace(
    /(\d{1,2})\s*[–-]\s*(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)/gi,
    (_match, s: string, e: string, ap: string) =>
      `${fmt00(to24(parseInt(s, 10), ap))}–${fmt00(to24(parseInt(e, 10), ap))}`,
  );
  out = out.replace(
    /(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)/gi,
    (_match, s: string, ap: string) => fmt00(to24(parseInt(s, 10), ap)),
  );
  return out;
}

/**
 * Compact form for accessory chips.
 *   ampm: "Fri 4p" / "Fri 4–6p" / "Sun 11a–1p"
 *   24h:  "Fri 15:00" / "Fri 15:00–18:00" / "Sun 11:00–13:00"
 *           (24h is always written in full — same as the long form)
 */
export function formatWindowCompact(
  w: Window,
  fmt: TimeFormat = "ampm",
): string {
  if (fmt === "24h") return formatWindow(w, fmt);

  const day = DAY_NAMES[jsToBufferDay(w.start.getDay())];
  const startH = w.start.getHours();
  const endH = startH + w.hours - 1;

  if (w.hours === 1) {
    return `${day} ${hour12(startH)}${ampmShort(startH)}`;
  }
  if (ampmShort(startH) === ampmShort(endH)) {
    return `${day} ${hour12(startH)}–${hour12(endH)}${ampmShort(endH)}`;
  }
  return `${day} ${hour12(startH)}${ampmShort(startH)}–${hour12(endH)}${ampmShort(endH)}`;
}
