const FILLED = "█";
const EMPTY = "░";
const DEFAULT_WIDTH = 15;

export function progressBar(percent: number, width: number = DEFAULT_WIDTH): string {
  const clamped = Math.min(100, Math.max(0, percent));
  let filled = Math.round((clamped / 100) * width);

  // Rounding alone would render 1% as entirely empty and 99% as entirely full,
  // erasing the distinction that matters most: used at all, and not yet done.
  if (clamped > 0 && filled === 0) filled = 1;
  if (clamped < 100 && filled === width) filled = width - 1;

  return FILLED.repeat(filled) + EMPTY.repeat(width - filled);
}

export function formatPercent(percent: number): string {
  const clamped = Math.min(100, Math.max(0, percent));
  // Sub-1% usage should read as "1%" rather than "0%" once anything has been spent.
  if (clamped > 0 && clamped < 1) return "<1%";
  return `${Math.round(clamped)}%`;
}

/**
 * Compact countdown: "1h 42m", "18m", "42s". Returns null once the moment has passed.
 */
export function formatCountdown(target: Date | null, now: Date = new Date()): string | null {
  if (!target) return null;
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;

  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (totalMinutes > 0) return `${totalMinutes}m`;
  return `${Math.floor(ms / 1000)}s`;
}

export function formatReset(target: Date | null, now: Date = new Date()): string {
  const countdown = formatCountdown(target, now);
  if (!countdown) return target ? "resetting" : "no reset window";
  return `reset ${countdown}`;
}

export function formatRelativeTime(from: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Parses a user-supplied comma-separated percentage list, dropping anything
 * out of range so a typo degrades to fewer alerts rather than none.
 */
export function parseThresholds(raw: string | undefined, fallback: number[]): number[] {
  if (raw === undefined) return fallback;
  const parsed = raw
    .split(",")
    .map((part) => Number.parseFloat(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 100);

  const unique = [...new Set(parsed)].sort((a, b) => a - b);
  // An empty field is a deliberate "no alerts"; an unparseable one falls back.
  if (unique.length === 0) return raw.trim() === "" ? [] : fallback;
  return unique;
}

export function parseMinutes(raw: string | undefined, fallback: number[]): number[] {
  if (raw === undefined) return fallback;
  const parsed = raw
    .split(",")
    .map((part) => Number.parseFloat(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  const unique = [...new Set(parsed)].sort((a, b) => b - a);
  if (unique.length === 0) return raw.trim() === "" ? [] : fallback;
  return unique;
}
