import { Cache } from "@raycast/api";
import { TweekCalendar, TweekCustomColor, TweekTask } from "../types";

const TASK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour session cache for calendars & colors

interface CacheEnvelope<T> {
  timestamp: number;
  data: T;
}

const memoryStore = new Map<string, string>();
let raycastCache: Cache | null = null;

function getCacheInstance(): Cache | null {
  if (raycastCache) return raycastCache;
  try {
    raycastCache = new Cache({ namespace: "tweek-task-manager" });
    return raycastCache;
  } catch {
    return null;
  }
}

function readRawCache<T>(key: string): CacheEnvelope<T> | null {
  const rc = getCacheInstance();
  const raw = rc ? (rc.get(key) ?? memoryStore.get(key)) : memoryStore.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

function writeRawCache<T>(key: string, data: T): void {
  const envelope: CacheEnvelope<T> = {
    timestamp: Date.now(),
    data,
  };
  const serialized = JSON.stringify(envelope);
  memoryStore.set(key, serialized);
  const rc = getCacheInstance();
  if (rc) {
    rc.set(key, serialized);
  }
}

export function getCachedCalendars(allowStale = false): TweekCalendar[] | null {
  const env = readRawCache<TweekCalendar[]>("calendars_session");
  if (!env) return null;
  if (!allowStale && Date.now() - env.timestamp > SESSION_CACHE_TTL_MS) {
    return null;
  }
  return env.data;
}

export function setCachedCalendars(calendars: TweekCalendar[]): void {
  writeRawCache("calendars_session", calendars);
}

export function getCachedColors(allowStale = false): TweekCustomColor[] | null {
  const env = readRawCache<TweekCustomColor[]>("colors_session");
  if (!env) return null;
  if (!allowStale && Date.now() - env.timestamp > SESSION_CACHE_TTL_MS) {
    return null;
  }
  return env.data;
}

export function setCachedColors(colors: TweekCustomColor[]): void {
  writeRawCache("colors_session", colors);
}

export function getTaskCacheKey(calendarId: string, scope = "default"): string {
  return `tasks_${calendarId}_${scope}`;
}

export function getCachedTasks(
  calendarId: string,
  scope = "default",
  allowStale = false,
): { tasks: TweekTask[]; isStale: boolean; updatedAt: number } | null {
  const key = getTaskCacheKey(calendarId, scope);
  const env = readRawCache<TweekTask[]>(key);
  if (!env) return null;
  const age = Date.now() - env.timestamp;
  const isStale = age > TASK_CACHE_TTL_MS;
  if (isStale && !allowStale) {
    return null;
  }
  return {
    tasks: env.data,
    isStale,
    updatedAt: env.timestamp,
  };
}

export function setCachedTasks(
  calendarId: string,
  tasks: TweekTask[],
  scope = "default",
): void {
  const key = getTaskCacheKey(calendarId, scope);
  writeRawCache(key, tasks);
}

export function invalidateTaskCache(calendarId?: string): void {
  if (!calendarId) {
    memoryStore.clear();
    getCacheInstance()?.clear();
    return;
  }
  const prefix = `tasks_${calendarId}_`;
  for (const k of Array.from(memoryStore.keys())) {
    if (k.startsWith(prefix)) {
      memoryStore.delete(k);
      getCacheInstance()?.remove(k);
    }
  }
}

export function useTaskCache() {
  return {
    getCachedCalendars,
    setCachedCalendars,
    getCachedColors,
    setCachedColors,
    getCachedTasks,
    setCachedTasks,
    invalidateTaskCache,
  };
}
