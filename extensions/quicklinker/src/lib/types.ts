export interface Shortcut {
  shortcut: string;
  url: string;
  title?: string;
}

export interface ShortcutsApiResponse {
  shortcuts: Shortcut[];
}

export interface CachedShortcuts {
  shortcuts: Shortcut[];
  fetchedAt: number;
}

export type CacheState =
  | { status: "fresh"; shortcuts: Shortcut[] }
  | { status: "stale"; shortcuts: Shortcut[] }
  | { status: "miss" };

export const API_BASE_URL = "https://quicklinker.app";
export const API_TOKEN_REGEX = /^qlapi_[0-9a-f]{32}$/;
export const CACHE_KEY = "shortcuts-cache";
export const CACHE_TTL_MS = 5 * 60 * 1000;
