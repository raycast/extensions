import { Cache } from "@raycast/api";
import { createHash } from "node:crypto";
import type { Today } from "../api/types";
import { preferences } from "./preferences";

const cache = new Cache();

const FINGERPRINT_KEY = "fingerprint";
const MENUBAR_KEY = "menubar";
const MENUBAR_ERROR_KEY = "menubar-error";

// The Raycast Cache is per-extension, not per-account. Clearing on API-key
// change prevents one account's data from painting for another.
export function ensureCacheOwner(): void {
  const { apiKey, baseUrl } = preferences();
  const fingerprint = createHash("sha256")
    .update(`${apiKey ?? ""}|${baseUrl ?? ""}`)
    .digest("hex")
    .slice(0, 16);
  if (cache.get(FINGERPRINT_KEY) !== fingerprint) {
    cache.clear();
    cache.set(FINGERPRINT_KEY, fingerprint);
  }
}

export interface MenuBarSnapshot {
  fetchedAt: string;
  today: Today;
}

export type MenuBarError = "network" | "auth";

function readJson<T>(key: string): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function readMenuBarSnapshot(): MenuBarSnapshot | undefined {
  return readJson<MenuBarSnapshot>(MENUBAR_KEY);
}

export function writeMenuBarSnapshot(today: Today): void {
  cache.set(MENUBAR_KEY, JSON.stringify({ fetchedAt: new Date().toISOString(), today }));
}

export function readMenuBarError(): MenuBarError | undefined {
  const value = cache.get(MENUBAR_ERROR_KEY);
  return value === "network" || value === "auth" ? value : undefined;
}

export function writeMenuBarError(error: MenuBarError | undefined): void {
  if (error) {
    cache.set(MENUBAR_ERROR_KEY, error);
  } else {
    cache.remove(MENUBAR_ERROR_KEY);
  }
}
