// Hardcoded pipeline constants for the TS port (Phase C).
// Source of truth: project/specs/phase-c-architecture.md.
// Everything here was a value in service/src/config.py. Phase A deferred all of
// these to v1.1 as user preferences; for v1 they ship as fixed constants.

// --- Focus categories blocked on every session (Path A, decisions.md 2026-05-29) ---
// All nine are Raycast BUILT-IN categories: Raycast ships them with their own
// app/website lists and resolves each name at session time, so they block for
// every user with zero setup, even categories the user has never picked manually
// (verified live 2026-06-29, solutions.md S17). No custom categories here.
export const FOCUS_CATEGORIES =
  "messaging,gaming,shopping,social,streaming,news,travel,sports,email";

// --- Session duration ---
// Focus session = event duration - this buffer (Phase A 2.1).
export const FOCUS_DURATION_BUFFER_MINUTES = 5;

// --- Event filtering ---
export const MIN_DURATION_MINUTES = 15; // Skip events strictly under this (Phase A 2.3).
// Fire window is [start, start + this]: an event fires on the first tick at/after
// its start, and is SKIPPED_MISSED only once now > start + this (decision.ts).
// Set to 120 (= 2× the 60s poll) so a tick always lands in the window even if one
// is skipped — fixes the D.3.c dropped-fire defect, where a 60s window == the 60s
// poll left no margin against tick jitter (margin collapsed to 1s; see
// specs/phase-d3c-fix-fire-window.md + decisions.md 2026-06-23). On-time fires are
// unchanged; only events that would have been dropped now fire (up to 2 min late).
// Baseline latency (fires 0-60s late) is a separate v1.1 fix (hold-and-sleep).
export const MISSED_GRACE_SECONDS = 120;

// --- Modal ---
export const CONFIRM_TIMEOUT_SECONDS = 30; // Auto-dismiss as Skip (Phase A 5.2).

// --- Polling ---
export const POLL_INTERVAL_SECONDS = 60; // Background command cadence (arch spec).
export const GCAL_FETCH_WINDOW_HOURS = 14; // How far ahead to fetch (daemon parity).

// --- Write-race guard (C4.a) ---
// A tick bails if an uncleared watcher_lock is younger than this. 45s is a wide
// margin over a healthy sub-5s tick, and stays under the 60s cadence so a tick
// that crashed without clearing its lock self-heals before the next poll.
// Source of truth: project/specs/phase-c4-trigger.md (C4.a).
export const WATCHER_LOCK_STALE_SECONDS = 45;

// --- State ---
export const STATE_PRUNE_AGE_HOURS = 24; // Drop processed-event entries older than this (daemon parity).

// --- Liveness heartbeat (D.3.a) ---
// Unconditional per-tick liveness line lands in a SEPARATE liveness.log (not
// focus.log, which stays transition-only — S7). The file self-caps so it ships
// bounded: once it exceeds MAX_BYTES it is trimmed to the last KEEP_LINES.
// ~10000 lines ≈ ~1 week at the 60s cadence; ~1 MB bounds a worst-case line.
// Source of truth: project/specs/phase-d3a-liveness-heartbeat.md.
export const LIVENESS_LOG_MAX_BYTES = 1_000_000;
export const LIVENESS_LOG_KEEP_LINES = 10_000;
