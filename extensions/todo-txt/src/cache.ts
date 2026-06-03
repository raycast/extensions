import { Cache } from "@raycast/api";
import type { TodoItem } from "./types";

/**
 * Single Cache instance shared across all commands in this extension.
 * Cache is scoped to the extension automatically by Raycast.
 */
export const sharedCache = new Cache();

const TODOS_CACHE_KEY = "todos";

/**
 * Write the current todo list into the shared cache.
 * Call this after every mutation so the menu-bar always has fresh data.
 */
export function cacheTodos(items: TodoItem[]): void {
  try {
    sharedCache.set(TODOS_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Cache writes are best-effort — never block on failure
  }
}

/**
 * Synchronously read the last-known todo list from cache.
 * Returns an empty array if the cache is empty or unparseable.
 */
export function getCachedTodos(): TodoItem[] {
  try {
    const raw = sharedCache.get(TODOS_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TodoItem[];
  } catch {
    return [];
  }
}
