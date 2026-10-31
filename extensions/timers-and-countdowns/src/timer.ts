import { LocalStorage } from "@raycast/api";
import { parse, parseDuration, scan, type ParseResult } from "@timelang/parse";

const TIMER_KEY_PREFIX = "timer:";

export interface ActiveTimer {
  id: string;
  endAt: number;
  startedAt: number;
  input: string;
  name?: string;
}

export interface ParsedTimer {
  endAt: number;
  name?: string;
}

export function formatTimerEndTime(endAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(endAt));
}

function unit(value: number, singular: string, plural = `${singular}s`): string {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`;
}

export function formatHumanDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(unit(days, "day"));
  }
  if (hours > 0) {
    parts.push(unit(hours, "hour"));
  }
  if (minutes > 0) {
    parts.push(unit(minutes, "minute"));
  }
  if (seconds > 0 && days === 0) {
    parts.push(unit(seconds, "second"));
  }
  if (parts.length === 0) {
    return unit(0, "second");
  }
  return parts.join(" ");
}

export function formatTimerName(timer: ActiveTimer): string {
  return timer.name || timer.input || "Timer";
}

export function normalizeName(name: string | undefined): string | undefined {
  const value = name?.trim().replace(/\s+/g, " ");
  return value || undefined;
}

function namesMatch(left: string | undefined, right: string | undefined): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function parseClockDuration(value: string): number | null {
  const match = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = match[3] === undefined ? undefined : Number(match[3]);
  if (second >= 60 || (third !== undefined && third >= 60)) {
    return null;
  }

  if (third !== undefined) {
    return ((first * 60 + second) * 60 + third) * 1000;
  }

  return (first * 60 + second) * 1000;
}

function toLocalWallClock(date: Date): number {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ).getTime();
}

function isRelativeInstant(phrase: string): boolean {
  return /^\s*in\s+/i.test(phrase);
}

function endAtFromResult(result: NonNullable<ParseResult>, phrase: string, now: Date): number | null {
  switch (result.type) {
    case "duration":
      return now.getTime() + result.duration;
    case "date":
      return isRelativeInstant(phrase) ? result.date.getTime() : toLocalWallClock(result.date);
    case "span":
    case "fuzzy":
      return toLocalWallClock(result.end);
    default:
      return null;
  }
}

function leftoverName(input: string, start: number, end: number): string | undefined {
  return normalizeName(`${input.slice(0, start)} ${input.slice(end)}`);
}

export function parseTimerPhrase(input: string, now = new Date()): ParsedTimer | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  const clockDuration = parseClockDuration(value);
  if (clockDuration !== null) {
    return { endAt: now.getTime() + clockDuration };
  }

  const parsed = parse(value, { referenceDate: now });
  if (parsed) {
    const endAt = endAtFromResult(parsed, value, now);
    if (endAt !== null) {
      return { endAt, name: normalizeName(parsed.title ?? undefined) };
    }
  }

  const duration = parseDuration(value, { referenceDate: now });
  if (duration !== null) {
    return { endAt: now.getTime() + duration };
  }

  const matches = scan(value, { referenceDate: now });
  const match = matches[0];
  if (!match) {
    return null;
  }

  const endAt = endAtFromResult(match.result, match.match, now);
  if (endAt === null) {
    return null;
  }

  return {
    endAt,
    name: leftoverName(value, match.start, match.end),
  };
}

function isTimer(value: unknown): value is ActiveTimer {
  if (!value || typeof value !== "object") {
    return false;
  }
  const timer = value as ActiveTimer;
  return typeof timer.id === "string" && Number.isFinite(timer.endAt);
}

function timerKey(id: string): string {
  return `${TIMER_KEY_PREFIX}${id}`;
}

function parseStoredTimer(value: unknown): ActiveTimer | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return isTimer(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function readTimerList(): Promise<ActiveTimer[]> {
  const items = await LocalStorage.allItems();
  const timers: ActiveTimer[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(TIMER_KEY_PREFIX)) {
      continue;
    }
    const timer = parseStoredTimer(value);
    if (timer) {
      timers.push(timer);
    }
  }
  return timers;
}

export async function getActiveTimers(): Promise<ActiveTimer[]> {
  return readTimerList();
}

const EXPIRED_CLEANUP_GRACE_MS = 2_000;

export async function removeExpiredTimers(now = Date.now()): Promise<ActiveTimer[]> {
  const expired = (await readTimerList()).filter((timer) => now - timer.endAt >= EXPIRED_CLEANUP_GRACE_MS);
  await Promise.all(expired.map((timer) => LocalStorage.removeItem(timerKey(timer.id))));
  return expired;
}

export async function upsertTimer(timer: ActiveTimer): Promise<ActiveTimer | undefined> {
  const timers = await getActiveTimers();
  const replaced = timer.name ? timers.find((candidate) => namesMatch(candidate.name, timer.name)) : undefined;
  if (replaced) {
    await LocalStorage.removeItem(timerKey(replaced.id));
  }
  await LocalStorage.setItem(timerKey(timer.id), JSON.stringify(timer));
  return replaced;
}

export async function removeTimer(id: string): Promise<ActiveTimer | undefined> {
  const timer = (await getActiveTimers()).find((candidate) => candidate.id === id);
  if (!timer) {
    return undefined;
  }
  await LocalStorage.removeItem(timerKey(id));
  return timer;
}

export async function stopAllTimers(): Promise<number> {
  const timers = await getActiveTimers();
  await Promise.all(timers.map((timer) => LocalStorage.removeItem(timerKey(timer.id))));
  return timers.length;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForTimer(id: string): Promise<"finished" | "stopped"> {
  let last: ActiveTimer | undefined;

  while (true) {
    const timer = (await getActiveTimers()).find((candidate) => candidate.id === id);
    if (!timer) {
      return last !== undefined && last.endAt <= Date.now() ? "finished" : "stopped";
    }

    last = timer;
    const remaining = timer.endAt - Date.now();
    if (remaining <= 0) {
      await removeTimer(id);
      return "finished";
    }

    await sleep(Math.min(250, remaining));
  }
}
