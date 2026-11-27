import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { EMPTY_STATE } from "./types.ts";
import type { SandglassState, Timer } from "./types.ts";

const MAX_RECENT = 5;

export function newTimer(
  durationMs: number,
  now: number,
  label?: string,
  id: string = randomUUID(),
  token: string = randomUUID(),
): Timer {
  const timer: Timer = {
    id,
    durationMs,
    startedAt: now,
    endsAt: now + durationMs,
    remainingMs: durationMs,
    status: "running",
    token,
  };
  return label ? { ...timer, label } : timer;
}

export function getRemainingMs(t: Timer, now: number): number {
  if (t.status === "running") return Math.max(0, t.endsAt - now);
  return t.status === "paused" ? t.remainingMs : 0;
}

/** Fraction of time left, from 1 (full) to 0 (done). */
export function getProgress(t: Timer, now: number): number {
  if (t.durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, getRemainingMs(t, now) / t.durationMs));
}

export function isDue(t: Timer, now: number): boolean {
  return t.status === "running" && t.endsAt <= now;
}

export function pauseTimer(t: Timer, now: number): Timer {
  if (t.status !== "running") return t;
  return { ...t, status: "paused", remainingMs: getRemainingMs(t, now), alertPid: undefined, pausedAt: now };
}

export function resumeTimer(t: Timer, now: number, token: string = randomUUID()): Timer {
  if (t.status !== "paused") return t;
  return { ...t, status: "running", endsAt: now + t.remainingMs, token, resumedAt: now };
}

/** When the sand started flowing for the current running phase (start, restart or resume). */
export function flowStartedAt(t: Timer): number {
  return t.resumedAt ?? t.startedAt;
}

/** When the sand stopped flowing (pause or finish), if it is not flowing. */
export function flowStoppedAt(t: Timer): number | undefined {
  if (t.status === "paused") return t.pausedAt;
  if (t.status === "finished") return t.finishedAt;
  return undefined;
}

export function addTime(t: Timer, ms: number, now: number, token: string = randomUUID()): Timer {
  switch (t.status) {
    case "running":
      return { ...t, endsAt: t.endsAt + ms, durationMs: t.durationMs + ms, token };
    case "paused":
      return { ...t, remainingMs: t.remainingMs + ms, durationMs: t.durationMs + ms };
    case "finished":
      return {
        ...t,
        status: "running",
        startedAt: now,
        endsAt: now + ms,
        durationMs: ms,
        remainingMs: ms,
        finishedAt: undefined,
        pausedAt: undefined,
        resumedAt: undefined,
        token,
      };
  }
}

export function restartTimer(t: Timer, now: number, token: string = randomUUID()): Timer {
  return {
    ...t,
    status: "running",
    startedAt: now,
    endsAt: now + t.durationMs,
    remainingMs: t.durationMs,
    finishedAt: undefined,
    pausedAt: undefined,
    resumedAt: undefined,
    token,
  };
}

export function finishTimer(t: Timer, now: number): Timer {
  return { ...t, status: "finished", finishedAt: now, remainingMs: 0, alertPid: undefined };
}

/** Finishes every due running timer (at its own end time). Returns the same object when nothing changed. */
export function settle(state: SandglassState, now: number): SandglassState {
  if (!state.timers.some((t) => isDue(t, now))) return state;
  return { ...state, timers: state.timers.map((t) => (isDue(t, now) ? finishTimer(t, t.endsAt) : t)) };
}

export function pushRecent(recent: number[], ms: number): number[] {
  return [ms, ...recent.filter((r) => r !== ms)].slice(0, MAX_RECENT);
}

// --- Storage ---

const STATUSES = ["running", "paused", "finished"];

function isTimer(value: unknown): value is Timer {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.token === "string" &&
    typeof t.status === "string" &&
    STATUSES.includes(t.status) &&
    typeof t.durationMs === "number" &&
    typeof t.startedAt === "number" &&
    typeof t.endsAt === "number" &&
    typeof t.remainingMs === "number"
  );
}

function freshState(): SandglassState {
  return { ...EMPTY_STATE, timers: [], recent: [] };
}

/** Reads the state file. A missing, corrupt or invalid file yields an empty state; this never throws. */
export function readState(filePath: string): SandglassState {
  try {
    const raw: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    if (typeof raw !== "object" || raw === null) return freshState();
    const { timers, recent } = raw as { timers?: unknown; recent?: unknown };
    return {
      version: 1,
      timers: Array.isArray(timers) ? timers.filter(isTimer) : [],
      recent: Array.isArray(recent)
        ? [...new Set(recent.filter((r): r is number => typeof r === "number" && r > 0))].slice(0, MAX_RECENT)
        : [],
    };
  } catch {
    return freshState();
  }
}

/** Error codes Windows returns while another process (e.g. the alert's PowerShell) briefly has the file open. */
const LOCKED_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);

const sleepSync = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * Renames `from` over `to`, retrying for a short while if the target is locked. The alert process reads the
 * state file once a second; during those few milliseconds Windows refuses to replace it.
 */
export function renameWithRetry(
  from: string,
  to: string,
  rename: (from: string, to: string) => void = renameSync,
  sleep: (ms: number) => void = sleepSync,
  attempts = 20,
): void {
  for (let attempt = 1; ; attempt++) {
    try {
      rename(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (attempt >= attempts || !LOCKED_CODES.has(code)) throw error;
      sleep(Math.min(10 * attempt, 50));
    }
  }
}

/** Writes atomically: temp file first, then rename over the target. */
export function writeState(filePath: string, state: SandglassState): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameWithRetry(tmp, filePath);
}

export function updateState(filePath: string, fn: (s: SandglassState) => SandglassState): SandglassState {
  const next = fn(readState(filePath));
  writeState(filePath, next);
  return next;
}
