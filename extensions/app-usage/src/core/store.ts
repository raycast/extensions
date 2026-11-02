import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { DayFile, DaySlice, SamplerState } from "./types";

const HOURS_IN_DAY = 24;
const DAY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.json$/;
/** A tick takes milliseconds. A lock this old was left by a holder that crashed. */
const LOCK_STALE_MS = 30_000;
/** How long an erase waits for a tick in progress before giving up. */
const LOCK_WAIT_MS = 5_000;
const LOCK_POLL_MS = 50;

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

/** Start of the next local hour. setHours copes with DST where adding 3600000ms would not. */
function nextHourStart(epochMs: number): number {
  const d = new Date(epochMs);
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const next = d.getTime();
  return next > epochMs ? next : epochMs + 3_600_000;
}

export interface HourPiece {
  date: string;
  hour: number;
  seconds: number;
}

/**
 * Spread `seconds` starting at `startMs` over the local hours they fall in.
 *
 * A one-minute window from 11:59:30 belongs half to 11 o'clock and half to noon,
 * and one from 23:59:30 straddles two day files. Rounding the running total
 * rather than each piece keeps the pieces summing to exactly `seconds`.
 */
export function splitByHour(startMs: number, seconds: number): HourPiece[] {
  const pieces: HourPiece[] = [];
  const endMs = startMs + seconds * 1000;
  let from = startMs;
  let assigned = 0;

  while (from < endMs) {
    const to = Math.min(nextHourStart(from), endMs);
    const upTo = Math.round((to - startMs) / 1000);
    if (upTo > assigned) pieces.push({ date: localDateKey(from), hour: localHour(from), seconds: upTo - assigned });
    assigned = upTo;
    from = to;
  }
  return pieces;
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
  const lockDir = path.join(root, "lock");
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

  /**
   * Add one sampling window to the day and hour buckets it covers.
   *
   * Active time opens the window and idle closes it, since idle is measured back
   * from the end of the window.
   */
  async function record(slice: DaySlice): Promise<void> {
    const appPieces = slice.app ? splitByHour(slice.at, slice.app.seconds) : [];
    const idlePieces =
      slice.idleSeconds > 0 ? splitByHour(slice.at + (slice.app?.seconds ?? 0) * 1000, slice.idleSeconds) : [];
    const dates = [...new Set([...appPieces, ...idlePieces].map((piece) => piece.date))];

    for (const date of dates) {
      const day: DayFile = (await readDay(date)) ?? { v: 1, date, apps: {} };

      const appToday = appPieces.filter((piece) => piece.date === date);
      if (slice.app && appToday.length > 0) {
        const existing = day.apps[slice.app.key];
        const entry = existing ?? { name: slice.app.name, hours: emptyHours() };
        if (entry.hours.length !== HOURS_IN_DAY) entry.hours = fixedHours(entry.hours);

        for (const piece of appToday) entry.hours[piece.hour] = (entry.hours[piece.hour] ?? 0) + piece.seconds;
        // Keep the display name fresh if the app was renamed.
        entry.name = slice.app.name;
        day.apps[slice.app.key] = entry;
      }

      const idleToday = idlePieces.filter((piece) => piece.date === date);
      if (idleToday.length > 0) {
        const idle = day.idle?.length === HOURS_IN_DAY ? day.idle : fixedHours(day.idle);
        for (const piece of idleToday) idle[piece.hour] = (idle[piece.hour] ?? 0) + piece.seconds;
        day.idle = idle;
      }

      await writeJsonAtomic(dayFile(date), day);
    }
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

  /** Drop day files older than the retention window. The window counts today, as the report's ranges do. */
  async function prune(retentionDays: number, nowMs: number): Promise<number> {
    if (!Number.isFinite(retentionDays) || retentionDays <= 0) return 0;

    // Oldest date to keep. 30 days ending today starts 29 days back.
    const cutoff = localDateKey(shiftDays(nowMs, -(retentionDays - 1)));
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
    const deadline = Date.now() + LOCK_WAIT_MS;
    while (!(await tryLock())) {
      if (Date.now() >= deadline) throw new Error("A sample is being recorded. Try again in a moment.");
      await delay(LOCK_POLL_MS);
    }
    try {
      await fs.rm(daysDir, { recursive: true, force: true });
      await fs.rm(stateFile, { force: true });
    } finally {
      await unlock();
    }
  }

  /**
   * Cross-process lock between the collector and the erase action, which run in
   * separate processes. Without it, a tick that read the files just before a
   * clear writes them back just after it, and the erase is silently undone.
   *
   * mkdir is atomic, so whoever creates the directory holds the lock.
   */
  async function tryLock(): Promise<boolean> {
    await fs.mkdir(root, { recursive: true });
    try {
      await fs.mkdir(lockDir);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }

    // Held. Break it only if its holder must have crashed.
    try {
      const { mtimeMs } = await fs.stat(lockDir);
      if (Date.now() - mtimeMs < LOCK_STALE_MS) return false;
      await fs.rm(lockDir, { recursive: true, force: true });
      await fs.mkdir(lockDir);
      return true;
    } catch {
      return false;
    }
  }

  async function unlock(): Promise<void> {
    await fs.rm(lockDir, { recursive: true, force: true });
  }

  /** Run `fn` holding the lock, or return false at once if someone else holds it. */
  async function ifUnlocked(fn: () => Promise<void>): Promise<boolean> {
    if (!(await tryLock())) return false;
    try {
      await fn();
    } finally {
      await unlock();
    }
    return true;
  }

  return {
    readState,
    writeState,
    readDay,
    record,
    listDays,
    prune,
    clear,
    ifUnlocked,
    paths: { root, stateFile, daysDir },
  };
}

export type Store = ReturnType<typeof createStore>;
