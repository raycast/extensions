// The island's Get back card as View Mac Status shows it (Mint 1.1.2's
// "Nudge"). Raycast is the pull side of the same facts: it shows what Mint
// found and never decides whether to nudge. Pure, so the tests call what the
// command draws. Every rule here is read from the Swift:
// IslandHistoryStore.getBackSeries and Array<IslandSeriesPoint>.rose
// (IslandFacts.swift), IslandModel.riseLine, IslandFormat.gb (IslandViews.swift),
// IslandPreferences.foundThreshold / foundLevelGB (IslandWorth.swift).

import { isAtLeastVersion } from "./mint-cli";
import type { StatusJSON } from "./mint-model";

/** The first Mint with the island. An older Mint keeps the glance it had. */
export const NUDGE_MINIMUM_VERSION = "1.1.2";

/** One Scan in `island-history.json` (`IslandHistory.Point`). */
export type IslandPoint = { at: number; getBackBytes: number };
/** A moment of the trend: Get back's rises so far, in GB. */
export type SeriesPoint = { at: number; gb: number };

/** Foundation's JSONEncoder writes a Date as seconds since 2001-01-01. */
const REFERENCE_DATE_MS = Date.UTC(2001, 0, 1);
const DAY_MS = 86_400_000;

/** The levels Notify me offers (`IslandWorth.foundLevelsGB`). */
export const FOUND_LEVELS_GB = [1, 2, 5, 10, 20, 50];

/**
 * The points of `island-history.json`, version 1 only, as the app decodes it;
 * anything else (a missing file, another version, malformed JSON) is no history.
 */
export function parseIslandHistory(text: string | undefined): IslandPoint[] | undefined {
  if (!text) return undefined;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  // Swift's synthesized Codable: every key but `baselineAt` is required, and
  // the byte counts are Int64. One bad point refuses the whole file.
  const file = json as { version?: unknown; points?: unknown; firstSeen?: unknown; baselineAt?: unknown };
  if (!file || typeof file !== "object" || file.version !== 1 || !Array.isArray(file.points)) return undefined;
  if (!file.firstSeen || typeof file.firstSeen !== "object" || Array.isArray(file.firstSeen)) return undefined;
  if (!Object.values(file.firstSeen).every(isNumber)) return undefined;
  if (file.baselineAt !== undefined && file.baselineAt !== null && !isNumber(file.baselineAt)) return undefined;
  const points: IslandPoint[] = [];
  for (const point of file.points as Array<Record<string, unknown>>) {
    if (!point || !isNumber(point.date)) return undefined;
    if (![point.getBackBytes, point.worktreeBytes, point.worktreeCount].every(Number.isSafeInteger)) return undefined;
    points.push({ at: REFERENCE_DATE_MS + (point.date as number) * 1000, getBackBytes: point.getBackBytes as number });
  }
  return points;
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** `IslandFormat.gigabytes`: decimal GB, never below zero. */
export function gigabytes(bytes: number): number {
  return Math.max(0, bytes) / 1e9;
}

/** `IslandFormat.gbUnit`: "29.7 GB", "120 GB"; the card always speaks GB. */
export function gbUnit(value: number): string {
  return `${value >= 100 ? value.toFixed(0) : Math.max(0, value).toFixed(1)} GB`;
}

/**
 * What piled up between Scans over 30 days: every rise counts, a clean does
 * not take it away. Empty until it rose (more than 0.05 GB over its start).
 */
export function getBackSeries(points: IslandPoint[], now: number, current: number): SeriesPoint[] {
  const recent = points.filter((point) => now - point.at <= 30 * DAY_MS);
  if (recent.length < 2) return [];
  const values = recent.map((point) => ({ at: point.at, bytes: point.getBackBytes }));
  if (values[values.length - 1].bytes !== current) values.push({ at: now, bytes: current });
  let total = 0;
  let previous: number | undefined;
  const out: SeriesPoint[] = [];
  for (const { at, bytes } of values) {
    if (previous !== undefined) total += Math.max(0, gigabytes(bytes) - gigabytes(previous));
    previous = bytes;
    out.push({ at, gb: total });
  }
  return rose(out) ? out : [];
}

function rose(series: SeriesPoint[]): boolean {
  if (series.length < 2) return false;
  return Math.max(...series.map((point) => point.gb)) - series[0].gb > 0.05;
}

/** The one quiet line under a drawn trend, in the dropdown's words. */
export function riseLine(series: SeriesPoint[]): string | undefined {
  if (series.length < 2) return undefined;
  const rise = series[series.length - 1].gb - series[0].gb;
  return rise > 0.05 ? `+${gbUnit(rise)} in 30 days` : undefined;
}

/**
 * The person's level for notes about space to get back, from
 * `defaults read com.mint.app` (each value as the command prints it, undefined
 * when the key is not set). Off when Notify me is off; the level when the
 * person (or Mint's seed) set one; nothing when the level was never written,
 * so Raycast never guesses Mint's seed by disk size. Worded as Mint 1.1.2 names
 * it: the page's setting "Notify me" and the level its bell shows ("5 GB", "Off").
 */
export function notifyLevel(on: string | undefined, gb: string | undefined): string | undefined {
  if (on !== undefined && ["0", "false", "no"].includes(on.trim().toLowerCase())) return "Notify me · Off";
  if (gb === undefined) return undefined;
  const value = Number(gb.trim());
  // As IslandPreferences.foundLevelGB: a value it does not offer reads as 5.
  return `Notify me · ${FOUND_LEVELS_GB.includes(value) ? value : 5} GB`;
}

export type NudgeCard = {
  /** Optimizable + Safe to clean, as the island's Get back. */
  getBackBytes: number;
  optimizableBytes: number;
  safeToCleanBytes: number;
  /** The trend, only once it rose. */
  series: SeriesPoint[];
  rise?: string;
  level?: string;
};

/** The card, from the same groups the Disk card folds; none without them or before Mint 1.1.2. */
export function nudgeCard(
  appVersion: string | undefined,
  groups: StatusJSON["groups"],
  history: IslandPoint[] | undefined,
  level: string | undefined,
  now: number,
): NudgeCard | undefined {
  if (!groups || !appVersion || !isAtLeastVersion(appVersion, NUDGE_MINIMUM_VERSION)) return undefined;
  const optimizableBytes = Math.max(0, groups.optimizableBytes ?? 0);
  const safeToCleanBytes = Math.max(0, groups.safeToCleanBytes ?? 0);
  const getBackBytes = optimizableBytes + safeToCleanBytes;
  const series = history ? getBackSeries(history, now, getBackBytes) : [];
  return { getBackBytes, optimizableBytes, safeToCleanBytes, series, rise: riseLine(series), level };
}
