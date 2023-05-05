import { Cache } from "@raycast/api";
import { Block, CacheableTimeEntry } from "../types";

const cache = new Cache();
const runningTimerKey = "runningTimer";
const pausedTimerKey = "pausedTimer";
const blocksKey = "blocks";

export function getCachedRunningTimer(): CacheableTimeEntry | null {
  const cached = cache.get(runningTimerKey);
  return cached ? (JSON.parse(cached) as CacheableTimeEntry | null) : null;
}

export function cacheRunningTimer(timeEntry: CacheableTimeEntry | null) {
  cache.set(runningTimerKey, JSON.stringify(timeEntry));
}

export function updateRunningTimerTitle(newTitle: string) {
  const cached = getCachedRunningTimer();
  if (cached && cached.title !== newTitle) {
    const updatedRunningTimer: CacheableTimeEntry = { ...cached, title: newTitle };
    cacheRunningTimer(updatedRunningTimer);
  }
}

export function getCachedPausedTimer(): CacheableTimeEntry | null {
  const cached = cache.get(pausedTimerKey);
  return cached ? (JSON.parse(cached) as CacheableTimeEntry) : null;
}

export function cachePausedTimer(timeEntry: CacheableTimeEntry | null) {
  cache.set(pausedTimerKey, JSON.stringify(timeEntry));
}

export function getCachedBlocks(): Block[] {
  const cached = cache.get(blocksKey);
  return cached ? (JSON.parse(cached) as Block[]) : [];
}

export function cacheBlocks(blocks: Block[]) {
  cache.set(blocksKey, JSON.stringify(blocks));
}
