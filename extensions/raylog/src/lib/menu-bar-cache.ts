import type { TaskRecord } from "./types";

export const MENU_BAR_CACHE_KEY = "menu-bar-state";

export interface MenuBarCacheState {
  currentTask?: TaskRecord;
  menuTasks: TaskRecord[];
  title: string;
  tooltip: string;
}

export interface MenuBarCacheStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function readMenuBarCache(
  cacheStore: MenuBarCacheStore,
): MenuBarCacheState | undefined {
  const cachedValue = cacheStore.get(MENU_BAR_CACHE_KEY);
  if (!cachedValue) {
    return undefined;
  }

  try {
    return JSON.parse(cachedValue) as MenuBarCacheState;
  } catch {
    cacheStore.remove(MENU_BAR_CACHE_KEY);
    return undefined;
  }
}

export function writeMenuBarCache(
  state: MenuBarCacheState,
  cacheStore: MenuBarCacheStore,
): void {
  cacheStore.set(MENU_BAR_CACHE_KEY, JSON.stringify(state));
}

export function clearMenuBarCache(cacheStore: MenuBarCacheStore): void {
  cacheStore.remove(MENU_BAR_CACHE_KEY);
}
