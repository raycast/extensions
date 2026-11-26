/**
 * Shared types for Sandglass. Pure module: must not import @raycast/api so it can be unit tested with Node.
 *
 * The state holds a list of timers from day one so that a future "several timers" version only needs UI changes.
 * Version 1 of the UI only ever shows and edits `timers[0]`.
 */

export type TimerStatus = "running" | "paused" | "finished";

export interface Timer {
  /** Stable id (random UUID). */
  id: string;
  /** Optional short label such as "Tea" or "Focus". */
  label?: string;
  /** Total length of the countdown in ms, including any minutes added later. Used for the dial progress. */
  durationMs: number;
  /** Epoch ms when the timer was (re)started. */
  startedAt: number;
  /** Epoch ms when the countdown reaches zero. Only meaningful while `status === "running"`. */
  endsAt: number;
  /** Remaining ms frozen at the moment of pausing. Only meaningful while `status === "paused"`. */
  remainingMs: number;
  status: TimerStatus;
  /** Epoch ms when the timer finished (set when status becomes "finished"). */
  finishedAt?: number;
  /** Epoch ms of the last pause (used for the dial's "sand runs out" transition). */
  pausedAt?: number;
  /** Epoch ms of the last resume (used for the dial's "sand starts flowing" transition). */
  resumedAt?: number;
  /**
   * Random token that changes every time the alert is (re)scheduled (start, resume, add time, restart).
   * The background alert process only fires if the token in the state file still matches its own.
   */
  token: string;
  /** PID of the background alert process, if one is scheduled. */
  alertPid?: number;
}

export interface SandglassState {
  version: 1;
  timers: Timer[];
  /** Recently used custom durations in ms, most recent first, unique, at most 5. Presets are not stored here. */
  recent: number[];
}

export type Theme = "light" | "dark";

export type AlertSound = "chime" | "alarm" | "silent";

export interface ParsedDuration {
  /** Countdown length in ms (> 0, at most 24 h). */
  ms: number;
  /** Optional label taken from extra words, e.g. "tea 5m" -> "Tea". */
  label?: string;
  /** "duration" for inputs like "25m", "clock" for "at 15:30" style inputs. */
  kind: "duration" | "clock";
}

export const EMPTY_STATE: SandglassState = { version: 1, timers: [], recent: [] };

export const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
