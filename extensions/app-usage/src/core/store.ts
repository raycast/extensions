import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { DayFile, DaySlice, SamplerState } from "./types";

const HOURS_IN_DAY = 24;
const DAY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.json$/;

/** YYYY-MM-DD in local time. Not UTC: days must line up with the user's day. */
export function localDateKey(epochMs: number): string {
  const d = new Date(epochMs);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Shift by whole calendar days.
 *
 * Adding or subtracting 86400000ms drifts by an hour across a daylight saving
 * transition, which lands on the wrong date for anything near midnight.
 */
export function shiftDays(epochMs: number, delta: number): number {
  const d = new Date(epochMs);
  d.setDate(d.getDate() + delta);
  return d.getTime();
}

/** Hour of the local day, 0 to 23. */
export function localHour(epochMs: number): number {
  return new Date(epochMs).getHours();
}

function emptyHours(): number[] {
  return new Array<number>(HOURS_IN_DAY).fill(0);
}

/**
 * File-backed store. Takes its root directory as an argument so it stays free of
 * Raycast imports and can be pointed at a temp dir in tests. The command passes
 * `environment.supportPath`.
 */
export function createStore(root: string) {
  const stateFile = path.join(root, "state.json");
  const daysDir = path.join(root, "days");
  const dayFile = (date: string) => path.join(daysDir, `${date}.json`);

  /**
   * Write via temp file plus rename so a crash cannot leave a half-written file.
   *
   * The temp name is unique per write. A shared one lets two concurrent ticks
   * interleave their bytes into the same file before either renames, producing
   * valid-looking JSON that parses as garbage, or fails to parse at all and
   * silently reads back as an empty day.
   */
  async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value), "utf8");
    await fs.rename(tmp, file);
  }

  async function readJson<T>(file: string): Promise<T | null> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as T;
    } catch {
      // Missing or corrupt. One unreadable day should not take down the rest.
      return null;
    }
  }

  async function readState(): Promise<SamplerState | null> {
    const state = await readJson<SamplerState>(stateFile);
    if (!state || typeof state.lastAt !== "number") return null;
    return state;
  }

  async function writeState(state: SamplerState): Promise<void> {
    await writeJsonAtomic(stateFile, state);
  }

  async function readDay(date: string): Promise<DayFile | null> {
    const day = await readJson<DayFile>(dayFile(date));
    if (!day || !day.apps) return null;
    return day;
  }

  /** Normalise an hours array that was truncated or hand-edited. */
  function fixedHours(values: number[] | undefined): number[] {
    const hours = emptyHours();
    (values ?? []).forEach((value, i) => {
      if (i < HOURS_IN_DAY && Number.isFinite(value) && value > 0) hours[i] = value;
    });
    return hours;
  }

  /** Add one sampling window to its day and hour bucket. */
  async function record(slice: DaySlice): Promise<void> {
    const date = localDateKey(slice.at);
    const hour = localHour(slice.at);

    const day: DayFile = (await readDay(date)) ?? { v: 1, date, apps: {} };

    if (slice.app) {
      const existing = day.apps[slice.app.key];
      const entry = existing ?? { name: slice.app.name, hours: emptyHours() };
      if (entry.hours.length !== HOURS_IN_DAY) entry.hours = fixedHours(entry.hours);

      entry.hours[hour] = (entry.hours[hour] ?? 0) + slice.app.seconds;
      // Keep the display name fresh if the app was renamed.
      entry.name = slice.app.name;
      day.apps[slice.app.key] = entry;
    }

    if (slice.idleSeconds > 0) {
      const idle = day.idle?.length === HOURS_IN_DAY ? day.idle : fixedHours(day.idle);
      idle[hour] = (idle[hour] ?? 0) + slice.idleSeconds;
      day.idle = idle;
    }

    await writeJsonAtomic(dayFile(date), day);
  }

  /** Every recorded date, ascending. */
  async function listDays(): Promise<string[]> {
    try {
      const files = await fs.readdir(daysDir);
      return files
        .map((f) => DAY_FILE_PATTERN.exec(f)?.[1])
        .filter((d): d is string => Boolean(d))
        .sort();
    } catch {
      return [];
    }
  }

  /** Drop day files older than the retention window. */
  async function prune(retentionDays: number, nowMs: number): Promise<number> {
    if (!Number.isFinite(retentionDays) || retentionDays <= 0) return 0;

    const cutoff = localDateKey(shiftDays(nowMs, -retentionDays));
    const dates = await listDays();
    let removed = 0;

    for (const date of dates) {
      // Lexicographic comparison is safe for YYYY-MM-DD.
      if (date >= cutoff) continue;
      try {
        await fs.unlink(dayFile(date));
        removed += 1;
      } catch {
        // Already gone. Nothing to do.
      }
    }
    return removed;
  }

  /** Erase everything this extension has stored. */
  async function clear(): Promise<void> {
    await fs.rm(daysDir, { recursive: true, force: true });
    await fs.rm(stateFile, { force: true });
  }

  return { readState, writeState, readDay, record, listDays, prune, clear, paths: { root, stateFile, daysDir } };
}

export type Store = ReturnType<typeof createStore>;
