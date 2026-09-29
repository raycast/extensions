import { localDateKey, shiftDays } from "./store";
import type { DayFile } from "./types";

const HOURS_IN_DAY = 24;
/** Display size of the detail panel's icon, in points. */
export const HERO_ICON_SIZE = 96;

export type RangeId = "today" | "yesterday" | "last7" | "last30";

export const RANGES: { id: RangeId; title: string }[] = [
  { id: "today", title: "Today" },
  { id: "yesterday", title: "Yesterday" },
  { id: "last7", title: "Last 7 Days" },
  { id: "last30", title: "Last 30 Days" },
];

/** `count` local date keys ending on the day `endOffset` days before now, ascending. */
function span(now: number, count: number, endOffset = 0): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(localDateKey(shiftDays(now, -(i + endOffset))));
  return out;
}

/** Local date keys a range covers, ascending. Days with no file are still listed. */
export function rangeDates(range: RangeId, now: number): string[] {
  switch (range) {
    case "today":
      return [localDateKey(now)];
    case "yesterday":
      return [localDateKey(shiftDays(now, -1))];
    case "last7":
      return span(now, 7);
    case "last30":
      return span(now, 30);
  }
}

/**
 * The week before a single-day range, used to answer "is today normal for me?".
 *
 * Null for multi-day ranges: comparing a span against the week before it invites
 * overlap and reads as a statistic nobody asked for.
 */
export function baselineDates(range: RangeId, now: number): string[] | null {
  if (range === "today") return span(now, 7, 1);
  if (range === "yesterday") return span(now, 7, 2);
  return null;
}

export interface RangeDay {
  date: string;
  file: DayFile | null;
}

export interface ReportRow {
  key: string;
  name: string;
  seconds: number;
  /** Fraction of the range total, 0 to 1. */
  share: number;
  /** 24 buckets, summed across every day in the range: an hour-of-day profile. */
  hours: number[];
  /** How many days in the range this app was seen on. */
  activeDays: number;
}

export interface Report {
  rows: ReportRow[];
  totalSeconds: number;
  /** 24 buckets of time present at the machine but idle, summed over the range. */
  idleHours: number[];
  idleSeconds: number;
  /** Every date the range asked for, ascending, whether or not it holds data. */
  dates: string[];
  /** Days in the range that recorded any time. Drives the honest coverage line. */
  daysWithData: number;
}

export const EMPTY_REPORT: Report = {
  rows: [],
  totalSeconds: 0,
  idleHours: new Array<number>(HOURS_IN_DAY).fill(0),
  idleSeconds: 0,
  dates: [],
  daysWithData: 0,
};

/**
 * Fold day files into one ranked table.
 *
 * Tolerant of malformed input on purpose: a hand-edited or truncated day file
 * should cost you that file, not the whole report.
 */
export function buildReport(days: RangeDay[]): Report {
  const acc = new Map<string, ReportRow>();
  const dates = days.map((day) => day.date);
  const idleHours = new Array<number>(HOURS_IN_DAY).fill(0);
  let totalSeconds = 0;
  let idleSeconds = 0;
  let daysWithData = 0;

  for (const day of days) {
    const apps = day.file?.apps;
    if (!apps) continue;
    let dayHadTime = false;

    for (const [key, app] of Object.entries(apps)) {
      if (!app || !Array.isArray(app.hours)) continue;

      const row = acc.get(key) ?? {
        key,
        name: app.name,
        seconds: 0,
        share: 0,
        hours: new Array<number>(HOURS_IN_DAY).fill(0),
        activeDays: 0,
      };

      let appSeconds = 0;
      app.hours.forEach((seconds, hour) => {
        if (hour >= HOURS_IN_DAY) return;
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        row.hours[hour] = (row.hours[hour] ?? 0) + seconds;
        appSeconds += seconds;
      });

      if (appSeconds > 0) {
        row.seconds += appSeconds;
        row.activeDays += 1;
        // The freshest file wins, so a renamed app shows its current name.
        row.name = app.name;
        totalSeconds += appSeconds;
        dayHadTime = true;
      }
      acc.set(key, row);
    }

    // Absent in files written before idle was recorded, which read as unknown.
    if (Array.isArray(day.file?.idle)) {
      day.file.idle.forEach((seconds, hour) => {
        if (hour >= HOURS_IN_DAY) return;
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        idleHours[hour] = (idleHours[hour] ?? 0) + seconds;
        idleSeconds += seconds;
        dayHadTime = true;
      });
    }

    if (dayHadTime) daysWithData += 1;
  }

  const rows = [...acc.values()].filter((row) => row.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  for (const row of rows) {
    row.share = totalSeconds > 0 ? row.seconds / totalSeconds : 0;
  }

  return { rows, totalSeconds, idleHours, idleSeconds, dates, daysWithData };
}

/** `2h 14m`, `14m`, `44s`. Never `0h 0m`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Percentage for display. A real slice of time never rounds down to a flat `0%`,
 * which would imply an app recorded nothing at all.
 */
export function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return "0%";
  if (share >= 1) return "100%";

  const percent = share * 100;
  if (percent < 1) return "<1%";
  // Rounding a near-total up to a flat 100% would imply nothing else was used.
  if (percent > 99) return ">99%";
  return `${Math.round(percent)}%`;
}

/**
 * A whole hour as a 12-hour clock time: `9 AM`, `12 PM`, `11 PM`.
 *
 * Every clock time in the extension goes through here, so the format is defined
 * once. Deliberately not locale-aware: `toLocaleTimeString` would render 24-hour
 * time for much of the world, and the point is a consistent 12-hour reading.
 */
export function hourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  // Midnight and noon are 12, not 0, on a 12-hour clock.
  const clock = hour % 12 === 0 ? 12 : hour % 12;
  return `${clock} ${period}`;
}

/**
 * An app's headline figure: how long, and what fraction of everything tracked.
 *
 * One value rather than two rows. They are the same measurement, absolute and
 * relative, and the duration leads because it is the one that answers the question.
 */
export function usageLabel(seconds: number, share: number): string {
  return `${formatDuration(seconds)} · ${formatShare(share)}`;
}

/**
 * Every hour tied for the most time, earliest first.
 *
 * Ties are common rather than exotic: a full minute of focus records 60s, so any
 * two hours spent entirely in one app both land on exactly 3600s. Returning only
 * the first would quietly present one of them as special.
 */
export function peakHours(hours: number[]): { hours: number[]; seconds: number } | null {
  let seconds = 0;
  let peak: number[] = [];

  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    const value = hours[hour] ?? 0;
    if (value <= 0) continue;

    if (value > seconds) {
      seconds = value;
      peak = [hour];
    } else if (value === seconds) {
      peak.push(hour);
    }
  }

  return peak.length > 0 ? { hours: peak, seconds } : null;
}

/** Beyond this the list of tied hours is summarised rather than spelled out. */
const MAX_LISTED_PEAK_HOURS = 3;

/**
 * `isSpan` marks a multi-day range, where the buckets are a sum across days and
 * the figure can exceed an hour. "10 AM · 30h" is nonsense without the qualifier,
 * so the total says so outright.
 */
export function peakHourLabel(hours: number[], isSpan = false): string | null {
  const peak = peakHours(hours);
  if (!peak) return null;

  const duration = isSpan ? `${formatDuration(peak.seconds)} total` : formatDuration(peak.seconds);
  if (peak.hours.length <= MAX_LISTED_PEAK_HOURS) {
    return `${peak.hours.map(hourLabel).join(", ")} · ${duration}`;
  }

  const shown = peak.hours.slice(0, MAX_LISTED_PEAK_HOURS).map(hourLabel).join(", ");
  return `${shown} +${peak.hours.length - MAX_LISTED_PEAK_HOURS} · ${duration}`;
}

/** 1-based position in the ranked table. */
export function rankOf(report: Report, key: string): number | null {
  const index = report.rows.findIndex((row) => row.key === key);
  return index < 0 ? null : index + 1;
}

/** Below this the baseline is too small for a ratio to carry any meaning. */
const MIN_BASELINE_SECONDS = 60;
/** At or above this, a multiplier reads better than a percentage. */
const MULTIPLIER_THRESHOLD = 2;

/** `4x`, not `4.0x`. One decimal below ten, where it still says something. */
function formatMultiplier(ratio: number): string {
  const rounded = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
  return `${rounded}x`;
}

/**
 * How this range compares with the same app over the preceding week.
 *
 * Averaged over the days the sampler actually recorded, not the seven calendar
 * days in the window. Dividing by seven treats every untracked day as a zero,
 * so a user whose history is sparse (which is every new user) sees an ordinary
 * day reported as a large spike.
 *
 * Large differences are stated as a multiple and small ones as a percentage.
 * "422% above" is read as 4.22x at a glance when it means 5.22x, and a multiple
 * has no such ambiguity; below 2x the percentage is the more natural reading.
 *
 * Returns null when there is no prior week to compare against, because an
 * invented baseline is worse than no answer.
 */
export function compareToBaseline(seconds: number, baseline: Report | null, key: string): string | null {
  if (!baseline || baseline.daysWithData <= 0) return null;

  const previous = baseline.rows.find((row) => row.key === key);
  if (!previous || previous.seconds <= 0) return null;

  const average = previous.seconds / baseline.daysWithData;
  // A ratio against a few seconds is noise dressed up as a finding.
  if (average < MIN_BASELINE_SECONDS) return null;

  const ratio = seconds / average;
  const percent = Math.round(Math.abs(ratio - 1) * 100);
  if (percent < 5) return `About average (${formatDuration(average)})`;

  // Worded rather than signed: Raycast mangles a metadata value that opens with
  // a symbol, and this reads better at a glance anyway.
  if (ratio >= MULTIPLIER_THRESHOLD) return `${formatMultiplier(ratio)} your ${formatDuration(average)} average`;
  return `${percent}% ${ratio > 1 ? "above" : "below"} your ${formatDuration(average)} average`;
}

/** Display name of a range, for the section header's left side. */
export function rangeTitle(range: RangeId): string {
  return RANGES.find((option) => option.id === range)?.title ?? "";
}

/**
 * Coverage, stated as what was actually tracked rather than as your screen time.
 * The sampler only runs while Raycast does, so the total is a floor, not a truth.
 *
 * Says nothing about which range this is: that sits in the section title beside it.
 *
 * `compact` is for the narrow list column that the detail panel leaves behind. The
 * full sentence wraps to two lines there and collides with the first row, so the
 * short form drops the prose and keeps only the numbers.
 */
export function coverageSummary(report: Report, compact = false): string {
  const appCount = report.rows.length;
  if (appCount === 0) return "Nothing tracked yet";

  const total = formatDuration(report.totalSeconds);
  const isSpan = report.dates.length > 1;

  if (compact) {
    const apps = `${appCount} ${appCount === 1 ? "app" : "apps"}`;
    const days = isSpan ? ` · ${report.daysWithData}/${report.dates.length} days` : "";
    return `${total} · ${apps}${days}`;
  }

  const apps = appCount === 1 ? "1 app" : `${appCount} apps`;
  if (!isSpan) return `Tracked ${total} across ${apps}`;
  return `Tracked ${total} across ${apps}, on ${report.daysWithData} of ${report.dates.length} days`;
}

/**
 * The detail panel's header: the app's icon, and its shape of day beneath.
 *
 * Raycast splits the panel in half whenever markdown is present, and that half is
 * reserved whatever we put in it. A chart is the content that earns it.
 *
 * Raycast centres a standalone block image on its own, which is the only
 * alignment control CommonMark offers here.
 *
 * Returns an empty string when there is nothing to draw, so the caller can omit
 * the markdown entirely and let the metadata use the full height.
 */
export function heroMarkdown(iconPath: string | null, chart: string | null, size = HERO_ICON_SIZE): string {
  const parts: string[] = [];
  // The support directory sits under "Application Support", so the path holds a
  // space and must be encoded before it can go in a markdown image.
  if (iconPath) parts.push(`![](${encodeURI(iconPath)}?raycast-width=${size}&raycast-height=${size})`);
  // No sizing query on the chart: it is a data URI, and a `?` after base64 is
  // ambiguous. The SVG declares its own width and height instead.
  if (chart) parts.push(`![](${chart})`);
  return parts.join("\n\n");
}

export interface HourApp {
  key: string;
  name: string;
  seconds: number;
}

export interface HourRow {
  hour: number;
  /** Active seconds across every app in this hour. */
  seconds: number;
  idleSeconds: number;
  /** Apps in this hour, busiest first. */
  apps: HourApp[];
}

/**
 * The same data read the other way round: hours down the side, applications
 * inside them.
 *
 * The app list answers "where did my time go". This answers "what was I doing at
 * three", which a ranking of totals cannot. Derived from an already-built report
 * rather than re-reading the day files.
 *
 * Hours with nothing recorded are omitted: a day is mostly empty hours, and
 * listing them buries the ones that matter.
 */
export function buildHours(report: Report): HourRow[] {
  const rows: HourRow[] = [];

  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    const apps: HourApp[] = [];
    let seconds = 0;

    for (const row of report.rows) {
      const value = row.hours[hour] ?? 0;
      if (value <= 0) continue;
      apps.push({ key: row.key, name: row.name, seconds: value });
      seconds += value;
    }

    const idle = report.idleHours[hour] ?? 0;
    if (seconds <= 0 && idle <= 0) continue;

    apps.sort((a, b) => b.seconds - a.seconds);
    rows.push({ hour, seconds, idleSeconds: idle, apps });
  }

  return rows;
}

/** `6h 2m active · 2h 12m idle`, or just the active half when nothing was idle. */
export function presenceLabel(activeSeconds: number, idleSeconds: number): string {
  const active = `${formatDuration(activeSeconds)} active`;
  return idleSeconds > 0 ? `${active} · ${formatDuration(idleSeconds)} idle` : active;
}

/** `Today`, `Yesterday`, then the date itself for anything older. */
export function dayTitle(date: string, now: number): string {
  if (date === localDateKey(now)) return "Today";
  if (date === localDateKey(shiftDays(now, -1))) return "Yesterday";

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * The day split into active and idle seconds per hour, ready to chart.
 *
 * Idle belongs to the machine rather than to any application, so it is carried
 * on the report itself and only recombined here.
 */
export function hourProfiles(report: Report): { active: number[]; idle: number[] } {
  const active = new Array<number>(HOURS_IN_DAY).fill(0);

  for (const row of report.rows) {
    for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
      active[hour] = (active[hour] ?? 0) + (row.hours[hour] ?? 0);
    }
  }

  return { active, idle: report.idleHours };
}
