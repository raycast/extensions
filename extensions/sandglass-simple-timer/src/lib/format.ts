import type { TimerStatus } from "./types.ts";

function splitSeconds(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "MM:SS" below one hour, "H:MM:SS" from one hour. Rounds up to whole seconds. */
export function formatClock(ms: number): string {
  const { h, m, s } = splitSeconds(ms);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type UnitNames = { h: [string, string]; m: [string, string]; s: [string, string] };

function formatParts(ms: number, units: UnitNames): string {
  const { h, m, s } = splitSeconds(ms);
  const part = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;
  const parts: string[] = [];
  if (h > 0) parts.push(part(h, units.h));
  if (m > 0) parts.push(part(m, units.m));
  if (s > 0 && h === 0) parts.push(part(s, units.s));
  return parts.length > 0 ? parts.join(" ") : part(0, units.s);
}

/** "1 hour 30 minutes", "45 seconds". Seconds are omitted from one hour up. */
export function formatHuman(ms: number): string {
  return formatParts(ms, { h: ["hour", "hours"], m: ["minute", "minutes"], s: ["second", "seconds"] });
}

/** "1 h 30 min", "45 sec". */
export function formatShort(ms: number): string {
  return formatParts(ms, { h: ["h", "h"], m: ["min", "min"], s: ["sec", "sec"] });
}

export function formatTimeOfDay(epochMs: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(epochMs);
}

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 11) return "Good morning ☀️";
  if (hour >= 12 && hour <= 17) return "Good afternoon 🌤️";
  if (hour >= 18 && hour <= 22) return "Good evening 🌙";
  return "Hello, night owl ✨";
}

const RUNNING_LINES = [
  "You've got this.",
  "One thing at a time.",
  "Breathe in, breathe out.",
  "Nice and steady.",
  "Stay with it.",
];

export function encouragement(status: TimerStatus, remainingMs: number, seed: number): string {
  if (status === "paused") return "Paused — take your time.";
  if (status === "finished") return "Time's up — nice work 🎉";
  if (remainingMs < 60_000) return "Almost there ✨";
  return RUNNING_LINES[Math.abs(Math.trunc(seed)) % RUNNING_LINES.length];
}
