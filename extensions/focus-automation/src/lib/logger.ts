import { environment } from "@raycast/api";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { LIVENESS_LOG_MAX_BYTES, LIVENESS_LOG_KEEP_LINES } from "./constants";

// Single log sink for the TS port (Phase C). See project/specs/phase-c-architecture.md.
//
// Mirrors the Python daemon's logger (service/src/logger.py) function-for-function
// so output is byte-identical and `grep <event_id> *.log` reconstructs the full
// story across every log file during the Phase D dual-run:
//
//   logEvent  ↔ logger.py log()        — structured event line, ALWAYS all four
//                                         field slots, "-" placeholder when absent.
//   logSystem ↔ logger.py log_system() — liveness/error line, "[ts] message", no fields.
//
// This file deliberately duplicates the format rather than refactoring
// confirm-focus.tsx (which is frozen during the port). The two converge once
// confirm-focus.tsx unfreezes (post-Phase-D).
//
//   [2026-06-01 14:30:00] TRIGGERED                  event_id="abc" title="Deep work" start="14:30" duration=55min
//   [2026-06-01 14:30:00] poll heartbeat

// Raycast's per-extension support dir. Stable across reloads. The watcher and
// (from C4) confirm-focus.tsx both append here.
export const LOG_PATH = join(environment.supportPath, "focus.log");

// Structured event line. Byte-identical to logger.py log(): all four field slots
// always present, "-" placeholder for a missing start or duration. `action` is the
// verb (TRIGGERED, SKIPPED_*, SCHEDULED, FETCHED…).
export function logEvent(
  action: string,
  eventId: string,
  title: string,
  start: Date | null,
  durationMin: number | null,
): void {
  const ts = formatTimestamp(new Date());
  const startStr = start ? formatHHMM(start) : "-";
  const durationStr = durationMin !== null ? `${durationMin}min` : "-";
  const line =
    `[${ts}] ${action.padEnd(26)}` +
    ` event_id="${eventId}"` +
    ` title="${title}"` +
    ` start="${startStr}"` +
    ` duration=${durationStr}\n`;
  write(line);
}

// Liveness / system line not tied to an event (heartbeat, errors). Byte-identical
// to logger.py log_system(): "[ts] message", no structured fields.
export function logSystem(message: string): void {
  const ts = formatTimestamp(new Date());
  write(`[${ts}] ${message}\n`);
}

function write(line: string): void {
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, line);
  } catch (e) {
    console.error(`[logger] Could not write to ${LOG_PATH}: ${e}`);
  }
}

// --- Liveness heartbeat (D.3.a) ---
// A SEPARATE sink from focus.log. focus.log is transition-only by design (S7):
// silence there can't prove the watcher is alive. liveness.log carries one
// UNCONDITIONAL line per tick so a missed fire is attributable (ran-but-missed
// vs not-running). It is system-format (no event_id), so the Phase D diff — which
// anchors on event_id="… (S9) — would ignore it even if pointed here; and it
// lives in its own file the diff never opens. Self-caps to ship bounded.
// Full rationale: project/specs/phase-d3a-liveness-heartbeat.md.
export const LIVENESS_PATH = join(environment.supportPath, "liveness.log");

// Emits one heartbeat line. MUST never throw: it is called from the watcher's
// `finally`, where a throw would replace the tick's original exception and mask
// a real error. All IO is swallowed to console, exactly like write() above.
export function logLiveness(message: string): void {
  const ts = formatTimestamp(new Date());
  const line = `[${ts}] ${message}\n`;
  try {
    mkdirSync(dirname(LIVENESS_PATH), { recursive: true });
    appendFileSync(LIVENESS_PATH, line);
    capLivenessLog();
  } catch (e) {
    console.error(`[logger] Could not write to ${LIVENESS_PATH}: ${e}`);
  }
}

// Bounds the liveness log. Cheap on the common path: a statSync per tick (no
// read). Only when the file crosses MAX_BYTES (~1/week) does it read, slice to
// the last KEEP_LINES, and rewrite. Serialized by the watcher's C4.a lock (this
// runs inside the lock window via the finally), so no concurrent-write race.
function capLivenessLog(): void {
  if (statSync(LIVENESS_PATH).size <= LIVENESS_LOG_MAX_BYTES) return;
  const lines = readFileSync(LIVENESS_PATH, "utf8").split("\n");
  // split on a trailing newline yields a final "" element; keeping the last
  // KEEP_LINES of the real lines and re-joining with a trailing newline
  // preserves the append-friendly shape.
  const kept = lines
    .filter((l) => l.length > 0)
    .slice(-LIVENESS_LOG_KEEP_LINES);
  writeFileSync(LIVENESS_PATH, kept.join("\n") + "\n");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTimestamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
