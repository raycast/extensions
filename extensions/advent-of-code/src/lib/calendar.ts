// Puzzles unlock at midnight US Eastern (UTC-5), which is 05:00 UTC
const UNLOCK_HOUR_UTC = 5;
export const FIRST_YEAR = 2015;

// Since 2025 the event has 12 puzzles instead of 25
export function puzzleCount(year: number): number {
  return year >= 2025 ? 12 : 25;
}

export function unlockTime(year: number, day: number): Date {
  return new Date(Date.UTC(year, 11, day, UNLOCK_HOUR_UTC));
}

// The most recent event that has at least one unlocked puzzle
export function latestYear(now = new Date()): number {
  const year = now.getUTCFullYear();
  return now >= unlockTime(year, 1) ? year : year - 1;
}

export function years(now = new Date()): number[] {
  const list: number[] = [];
  for (let year = latestYear(now); year >= FIRST_YEAR; year--) list.push(year);
  return list;
}

export function unlockedDays(year: number, now = new Date()): number[] {
  const days: number[] = [];
  for (let day = 1; day <= puzzleCount(year); day++) {
    if (unlockTime(year, day) <= now) days.push(day);
  }
  return days;
}

export function latestPuzzle(now = new Date()): { year: number; day: number } {
  const year = latestYear(now);
  const days = unlockedDays(year, now);
  return { year, day: days[days.length - 1] };
}

export function nextUnlock(now = new Date()): { year: number; day: number; at: Date } {
  const year = now.getUTCFullYear();
  for (let day = 1; day <= puzzleCount(year); day++) {
    const at = unlockTime(year, day);
    if (at > now) return { year, day, at };
  }
  return { year: year + 1, day: 1, at: unlockTime(year + 1, 1) };
}

export function isEventRunning(now = new Date()): boolean {
  const year = now.getUTCFullYear();
  const last = unlockTime(year, puzzleCount(year));
  return now >= unlockTime(year, 1) && now.getTime() < last.getTime() + 24 * 60 * 60 * 1000;
}

export function formatDuration(ms: number, withSeconds = false): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return withSeconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

// Solve time measured from the puzzle's unlock, the way Advent of Code shows it
export function formatSolveTime(year: number, day: number, timestamp: number): string {
  const ms = timestamp * 1000 - unlockTime(year, day).getTime();
  if (ms >= 24 * 60 * 60 * 1000) return ">24h";
  const total = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
