import type { Context, Timer } from "../api/types";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

// Static durations: < 1 h as "Xm", ≥ 1 h as "Xh Ym".
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${pad(minutes)}m`;
}

// Ticking clocks: < 1 h as "m:ss", ≥ 1 h as "h:mm:ss".
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours === 0) return `${minutes}:${pad(secs)}`;
  return `${hours}:${pad(minutes)}:${pad(secs)}`;
}

// Mirrors the app's own formatCompactDuration: "0" for zero, "<1m" under a
// minute, else "Xh Ym" / "Xh" / "Ym" (omitting a zero component).
export function formatCompactDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds === 0) return "0";
  if (seconds < 60) return "<1m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Sign convention mirrors the app's formatRemainingTime: "-Xh Ym" while time
// is left, flips to "+Xh Ym" once overdue.
export function formatRemaining(remaining: number): string {
  if (Math.floor(Math.abs(remaining)) === 0) return "0";
  return `${remaining < 0 ? "+" : "-"}${formatCompactDuration(Math.abs(remaining))}`;
}

function currentIntervalSeconds(startIso: string, now: number): number {
  return Math.max(0, (now - new Date(startIso).getTime()) / 1000);
}

// Seconds since the current running interval started, excluding
// completed_duration_seconds. Used only for Stats' live addition, where the
// baseline already accounts for the completed portion.
export function currentTimerIntervalSeconds(timer: Timer, now: number): number {
  const startIso = timer.active_event?.started_at ?? (timer.active ? timer.started_at : null);
  return startIso ? currentIntervalSeconds(startIso, now) : 0;
}

export function currentContextIntervalSeconds(context: Context, now: number): number {
  return context.running ? currentIntervalSeconds(context.started_at, now) : 0;
}

// Total elapsed = persisted completed portion + current interval. Safe to
// call unconditionally — degrades to completed_duration_seconds when idle.
export function elapsedTimerSeconds(timer: Timer, now: number): number {
  return timer.completed_duration_seconds + currentTimerIntervalSeconds(timer, now);
}

export function elapsedContextSeconds(context: Context, now: number): number {
  return context.completed_duration_seconds + currentContextIntervalSeconds(context, now);
}

// undefined when the timer has no planned started_at/ended_at schedule.
export function remainingSeconds(timer: Timer, now: number): number | undefined {
  if (!timer.started_at || !timer.ended_at) return undefined;
  const planned = (new Date(timer.ended_at).getTime() - new Date(timer.started_at).getTime()) / 1000;
  return planned - elapsedTimerSeconds(timer, now);
}

export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatScheduledRange(timer: Timer): string | undefined {
  if (!timer.started_at) return undefined;
  const start = formatTimeOfDay(timer.started_at);
  return timer.ended_at ? `${start} – ${formatTimeOfDay(timer.ended_at)}` : start;
}

export function formatRelative(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}
