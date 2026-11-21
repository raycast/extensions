import { Cache } from "@raycast/api";
import { isRecord } from "../core/guards";
import type { CatalogEntry, ProviderId } from "../core/types";

/** Bump when the stored shape changes; an unknown version is treated as an empty cache. */
export const CACHE_VERSION = 2;
const CACHE_KEY = "catalog";

export interface CatalogSnapshot {
  entries: CatalogEntry[];
  /** Last successful fetch per provider (ms since epoch). Failed fetches do not update it. */
  fetchedAt: Partial<Record<ProviderId, number>>;
}

export interface CatalogStore {
  read(): CatalogSnapshot;
  write(snapshot: CatalogSnapshot): void;
}

/** The part of Raycast's `Cache` that is used, so tests can pass any string store. */
export interface StringCache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

const PROVIDERS: readonly string[] = ["anthropic", "openai", "gemini", "openrouter"];

function isEntry(value: unknown): value is CatalogEntry {
  if (!isRecord(value) || !isRecord(value["ref"])) return false;
  const { provider, modelId } = value["ref"];
  return (
    typeof provider === "string" &&
    PROVIDERS.includes(provider) &&
    typeof modelId === "string" &&
    typeof value["displayName"] === "string" &&
    typeof value["family"] === "string"
  );
}

function emptySnapshot(): CatalogSnapshot {
  return { entries: [], fetchedAt: {} };
}

function parseSnapshot(text: string | undefined): CatalogSnapshot {
  if (text === undefined) return emptySnapshot();
  try {
    const data: unknown = JSON.parse(text);
    if (!isRecord(data) || data["version"] !== CACHE_VERSION) return emptySnapshot();
    const entries = Array.isArray(data["entries"]) ? data["entries"].filter(isEntry) : [];
    const fetchedAt: CatalogSnapshot["fetchedAt"] = {};
    const stored = data["fetchedAt"];
    if (isRecord(stored)) {
      for (const provider of PROVIDERS) {
        const value = stored[provider];
        if (typeof value === "number" && Number.isFinite(value)) fetchedAt[provider as ProviderId] = value;
      }
    }
    return { entries, fetchedAt };
  } catch {
    // A corrupted cache is never fatal: the catalog simply reloads.
    return emptySnapshot();
  }
}

export function createCatalogStore(cache?: StringCache): CatalogStore {
  let store = cache;
  // Created lazily so importing this module has no side effects.
  const resolve = (): StringCache => (store ??= new Cache({ namespace: "model-catalog" }));
  return {
    read() {
      try {
        return parseSnapshot(resolve().get(CACHE_KEY));
      } catch {
        return emptySnapshot();
      }
    },
    write(snapshot) {
      try {
        resolve().set(CACHE_KEY, JSON.stringify({ version: CACHE_VERSION, ...snapshot }));
      } catch {
        // Persisting is best effort; the in-memory result is still returned to the caller.
      }
    },
  };
}
