import type { RepositoryUserData } from "../types/repository";

/**
 * Pure transformations over {@link RepositoryUserData}. Keeping these free of
 * I/O makes the ranking-relevant behavior (open counts, favorites, pins)
 * exhaustively unit-testable. The file-backed store in `user-data-store.ts`
 * composes these with persistence.
 */

/** The default user data for a repository the user has never interacted with. */
export function defaultUserData(): RepositoryUserData {
  return { pinned: false, favorite: false, lastOpenedAt: null, openCount: 0 };
}

/** Look up user data for a path, falling back to {@link defaultUserData}. */
export function getUserData(map: ReadonlyMap<string, RepositoryUserData>, path: string): RepositoryUserData {
  return map.get(path) ?? defaultUserData();
}

/** Return a copy of `data` reflecting one more "open" at `nowMs`. */
export function recordOpen(data: RepositoryUserData, nowMs: number): RepositoryUserData {
  return { ...data, lastOpenedAt: nowMs, openCount: data.openCount + 1 };
}

/** Return a copy of `data` with the favorite flag flipped. */
export function toggleFavorite(data: RepositoryUserData): RepositoryUserData {
  return { ...data, favorite: !data.favorite };
}

/** Return a copy of `data` with the pinned flag flipped. */
export function togglePin(data: RepositoryUserData): RepositoryUserData {
  return { ...data, pinned: !data.pinned };
}
