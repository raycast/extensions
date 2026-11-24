/**
 * The running block or break. Pure functions only (no Raycast imports), so they can be tested.
 * Times are milliseconds since the epoch.
 */

export type Phase = "focus" | "break";

export interface RunningTimer {
  /** UUID; for a focus block it is also the id sent to Kiri (client_block_id). */
  id: string;
  phase: Phase;
  minutes: number;
  startedAt: number;
  /** When the timer ends. Moved later by the time spent paused. */
  endAt: number;
  /** When it was paused, or null while it runs. */
  pausedAt: number | null;
  task: string;
  /** Sound key ("brownnoise", "rain", ...) or "" for none. */
  sound: string;
}

/** A break offered after a focus block, waiting for the user to start it. */
export interface PendingBreak {
  minutes: number;
  /** When the focus block ended. The offer is dropped after a while. */
  since: number;
}

export const MIN_MINUTES = 1;
/** Kiri saves blocks of at most two hours. */
export const MAX_MINUTES = 120;
export const MAX_TASK_LENGTH = 200;
/** A waiting break is no longer offered after this long. */
export const PENDING_BREAK_TTL = 60 * 60 * 1000;

export function startTimer(
  phase: Phase,
  minutes: number,
  now: number,
  id: string,
  task = "",
  sound = "",
): RunningTimer {
  const m = clampMinutes(minutes);
  return {
    id,
    phase,
    minutes: m,
    startedAt: now,
    endAt: now + m * 60_000,
    pausedAt: null,
    task: cleanTask(task),
    sound,
  };
}

export function remainingMs(t: RunningTimer, now: number): number {
  const at = t.pausedAt ?? now;
  return Math.max(0, t.endAt - at);
}

export function isDone(t: RunningTimer, now: number): boolean {
  return t.pausedAt === null && now >= t.endAt;
}

export function pauseTimer(t: RunningTimer, now: number): RunningTimer {
  if (t.pausedAt !== null) return t;
  return { ...t, pausedAt: Math.min(now, t.endAt) };
}

export function resumeTimer(t: RunningTimer, now: number): RunningTimer {
  if (t.pausedAt === null) return t;
  const paused = Math.max(0, now - t.pausedAt);
  return { ...t, endAt: t.endAt + paused, pausedAt: null };
}

/** Short form for the menu bar: "25m", "1m", "45s". */
export function formatShort(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s >= 60) return `${Math.ceil(s / 60)}m`;
  return `${Math.max(0, s)}s`;
}

/** Clock form: "24:05", "1:02:00". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function clampMinutes(n: number): number {
  if (!Number.isFinite(n)) return 25;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n)));
}

/** A whole number of minutes from 1 to 120, or null. */
export function parseMinutes(text: string | undefined): number | null {
  const v = (text ?? "").trim();
  if (!/^\d{1,3}$/.test(v)) return null;
  const n = Number(v);
  return n >= MIN_MINUTES && n <= MAX_MINUTES ? n : null;
}

/** One line, no extra spaces, at most 200 characters (without splitting an emoji). */
export function cleanTask(text: string): string {
  const one = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(one);
  return chars.length <= MAX_TASK_LENGTH ? one : chars.slice(0, MAX_TASK_LENGTH).join("");
}

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Read a stored timer, or null when there is none or it is damaged. */
export function parseTimer(value: unknown): RunningTimer | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.phase !== "focus" && v.phase !== "break") return null;
  if (typeof v.id !== "string" || !v.id) return null;
  if (!num(v.minutes) || v.minutes < MIN_MINUTES || v.minutes > MAX_MINUTES) return null;
  if (!num(v.startedAt) || !num(v.endAt) || v.endAt < v.startedAt) return null;
  const pausedAt = num(v.pausedAt) ? v.pausedAt : null;
  return {
    id: v.id,
    phase: v.phase,
    minutes: v.minutes,
    startedAt: v.startedAt,
    endAt: v.endAt,
    pausedAt,
    task: typeof v.task === "string" ? cleanTask(v.task) : "",
    sound: typeof v.sound === "string" && /^[a-z0-9_-]{0,40}$/.test(v.sound) ? v.sound : "",
  };
}

export function parsePendingBreak(value: unknown, now: number): PendingBreak | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!num(v.minutes) || v.minutes < 1 || v.minutes > 60 || !num(v.since)) return null;
  if (now - v.since > PENDING_BREAK_TTL) return null;
  return { minutes: v.minutes, since: v.since };
}
