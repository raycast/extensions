import { createHash } from "node:crypto";
import type { Environment } from "./t212/types";

/** Raycast's `Cache` satisfies this (synchronous get/set of strings). */
export interface SyncStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

/** A short hash of the API key that keeps cached data per account without storing the key. */
export function apiKeyHash(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 12);
}

export function historyCacheKey(environment: Environment, apiKey: string, kind: string): string {
  return `history:${environment}:${apiKeyHash(apiKey)}:${kind}`;
}

/**
 * Last portfolio data, shared by every command. `useCachedPromise` caches per function *per command
 * bundle*, so without this the menu bar starts empty and a single 429 leaves it on an error.
 */
export function portfolioSnapshotKey(environment: Environment, keyHash: string): string {
  return `portfolio:${environment}:${keyHash}`;
}

export function readSnapshot<T>(store: SyncStore, key: string): T | undefined {
  const raw = store.get(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeSnapshot<T>(store: SyncStore, key: string, value: T): void {
  store.set(key, JSON.stringify(value));
}
