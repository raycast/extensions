import type { Library } from "./models";
import { migrateIdentities } from "./identity";

export const LIBRARY_KEY = "library-v2";
export const BACKUP_KEY = "library-v2-previous";
export const LEGACY_KEYS = {
  custom: "custom-cheatsheets",
  repositories: "user-repositories",
  sheets: "repository-cheatsheets",
  favorites: "favorite-cheatsheets",
  hidden: "hidden-cheatsheets",
  views: "cheatsheet-views",
} as const;
export interface StoragePort {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<unknown>;
}
export type Lock = <T>(work: () => Promise<T>) => Promise<T>;

export class StorageError extends Error {
  constructor(key: string) {
    super(
      `Cannot safely read or confirm saving ${key}. Check saved content before retrying; preserve current, previous and legacy data before recovery. Do not reset storage.`,
    );
    this.name = "StorageError";
  }
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function strings(v: Record<string, unknown>, keys: string[]) {
  return keys.every((k) => typeof v[k] === "string");
}
function numbers(v: Record<string, unknown>, keys: string[]) {
  return keys.every((k) => typeof v[k] === "number" && Number.isFinite(v[k]));
}
function optional(v: Record<string, unknown>, key: string, type: "string" | "number") {
  return v[key] === undefined || (typeof v[key] === type && (type !== "number" || Number.isFinite(v[key])));
}
function validRecord(collection: keyof typeof LEGACY_KEYS, v: unknown): boolean {
  if (!object(v)) return false;
  if (collection === "custom") {
    return (
      strings(v, ["id", "title", "content"]) &&
      numbers(v, ["createdAt", "updatedAt"]) &&
      optional(v, "description", "string") &&
      (v.tags === undefined || (Array.isArray(v.tags) && v.tags.every((t) => typeof t === "string")))
    );
  }
  if (collection === "repositories") {
    return (
      strings(v, ["id", "name", "owner", "url", "defaultBranch"]) &&
      numbers(v, ["addedAt"]) &&
      typeof v.isPrivate === "boolean" &&
      ["description", "subdirectory", "revision"].every((k) => optional(v, k, "string")) &&
      ["lastAccessedAt", "lastSyncedAt"].every((k) => optional(v, k, "number"))
    );
  }
  if (collection === "sheets") {
    return (
      strings(v, ["id", "repositoryId", "slug", "title", "content", "filePath"]) &&
      numbers(v, ["syncedAt"]) &&
      optional(v, "lastAccessedAt", "number") &&
      optional(v, "revision", "string")
    );
  }
  return (
    ["custom", "default", "repository"].includes(String(v.type)) &&
    strings(v, ["slug", "title"]) &&
    (collection === "favorites"
      ? strings(v, ["id"]) && numbers(v, ["favoritedAt"])
      : strings(v, ["key"]) && numbers(v, collection === "views" ? ["count", "lastViewedAt"] : ["hiddenAt"]))
  );
}
function parse(raw: unknown, key: string): unknown {
  if (typeof raw !== "string") throw new StorageError(key);
  try {
    return JSON.parse(raw);
  } catch {
    throw new StorageError(key);
  }
}
export function validateLibrary(value: unknown): asserts value is Library {
  if (
    !object(value) ||
    value.version !== 2 ||
    !Array.isArray(value.unresolvedLegacyKeys) ||
    !value.unresolvedLegacyKeys.every((k) => typeof k === "string")
  )
    throw new StorageError(LIBRARY_KEY);
  for (const collection of Object.keys(LEGACY_KEYS) as (keyof typeof LEGACY_KEYS)[]) {
    const records = value[collection];
    if (!Array.isArray(records) || !records.every((v) => validRecord(collection, v)))
      throw new StorageError(LEGACY_KEYS[collection]);
    const keys = records.map((v) => (collection === "favorites" ? `${v.type}:${v.slug}` : "key" in v ? v.key : v.id));
    if (new Set(keys).size !== keys.length) throw new StorageError(LEGACY_KEYS[collection]);
  }
}

// One encrypted LocalStorage value commits content and sync metadata together.
// The injected lock must cover read -> backup -> write across command processes.
export class LibraryStore {
  constructor(
    private storage: StoragePort,
    private lock: Lock,
  ) {}

  private async readUnlocked(): Promise<Library> {
    const raw = await this.storage.getItem(LIBRARY_KEY);
    if (raw !== undefined) {
      const parsed = parse(raw, LIBRARY_KEY);
      validateLibrary(parsed);
      return parsed;
    }
    const legacy: Record<string, unknown> = { version: 2, unresolvedLegacyKeys: [] };
    for (const [collection, key] of Object.entries(LEGACY_KEYS)) {
      const saved = await this.storage.getItem(key);
      legacy[collection] = saved === undefined ? [] : parse(saved, key);
    }
    // Support documented old field names without inventing missing identities.
    if (Array.isArray(legacy.repositories)) {
      legacy.repositories = legacy.repositories.map((r) =>
        object(r)
          ? {
              ...r,
              name: r.name ?? r.repo,
              defaultBranch: r.defaultBranch ?? r.branch,
            }
          : r,
      );
    }
    validateLibrary(legacy);
    return migrateIdentities(legacy);
  }

  async read(): Promise<Library> {
    return this.lock(async () => {
      try {
        return await this.readUnlocked();
      } catch (error) {
        throw error instanceof StorageError ? error : new StorageError(LIBRARY_KEY);
      }
    });
  }

  async update<T>(change: (library: Library) => T, signal?: AbortSignal): Promise<T> {
    return this.lock(async () => {
      let library: Library;
      try {
        library = await this.readUnlocked();
      } catch (error) {
        throw error instanceof StorageError ? error : new StorageError(LIBRARY_KEY);
      }
      const previous = JSON.stringify(library);
      const result = change(library);
      validateLibrary(library);
      try {
        await this.storage.setItem(BACKUP_KEY, previous);
        signal?.throwIfAborted();
        await this.storage.setItem(LIBRARY_KEY, JSON.stringify(library));
      } catch {
        throw new StorageError(LIBRARY_KEY);
      }
      return result;
    });
  }
}
