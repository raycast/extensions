import { Cache } from "@raycast/api";
import { normalizeState, type ExtensionState } from "./store";
import type { ValDetailResponse } from "./types";
import type { ValConfig } from "./valconfig";

/**
 * Raycast's Cache is synchronous, so a command paints from it on its first render rather than after
 * the two network calls `loadState` needs. Everything here is a copy of server state, never the
 * source of truth: a miss costs a wait, never correctness.
 */
const cache = new Cache({ namespace: "val-town" });

const STATE_ENTRY = "state";
const CONFIGS_ENTRY = "configs";

function read<T>(key: string): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * A shape written by an older build is migrated rather than discarded, so an upgrade does not cost a
 * cold start. `normalizeState` is called inside this function, never at module load, so the import
 * cycle back to `store` stays harmless.
 */
export function cachedState(): ExtensionState | undefined {
  const state = read<Record<string, unknown>>(STATE_ENTRY);
  return state ? normalizeState(state) : undefined;
}

export function cacheState(state: ExtensionState): void {
  cache.set(STATE_ENTRY, JSON.stringify(state));
}

/** Keyed by `handle/valName`. A null value is a val read to carry no config, which is worth caching. */
export function cachedConfigs(): Record<string, ValConfig | null> {
  return read<Record<string, ValConfig | null>>(CONFIGS_ENTRY) ?? {};
}

export function cacheConfigs(configs: Record<string, ValConfig | null>): void {
  cache.set(CONFIGS_ENTRY, JSON.stringify(configs));
}

/** A val's README, kept against the file version so a re-read only happens when it actually changed. */
type CachedReadme = { version: number; content: string };

export function cachedReadme(val: string): CachedReadme | undefined {
  return read<CachedReadme>(`readme:${val}`);
}

export function cacheReadme(val: string, entry: CachedReadme): void {
  cache.set(`readme:${val}`, JSON.stringify(entry));
}

/**
 * A val's detail, keyed by its main branch version — the number that moves on every commit. A
 * matching version means everything derived from the val's code is still current.
 */
type CachedVal = { version: number; detail: ValDetailResponse };

export function cachedVal(val: string): CachedVal | undefined {
  return read<CachedVal>(`val:${val}`);
}

export function cacheVal(val: string, entry: CachedVal): void {
  cache.set(`val:${val}`, JSON.stringify(entry));
}
