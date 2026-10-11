export interface QueryCacheStorage {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

export interface CachedQuery<T> {
  data: T;
  updatedAt: number;
}

const VERSION = 1;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export class QueryCache {
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly generations = new Map<string, number>();

  constructor(
    private readonly storage: QueryCacheStorage,
    private readonly now: () => number = Date.now,
  ) {}

  read<T>(key: string): CachedQuery<T> | undefined {
    try {
      const raw = this.storage.get(key);
      if (raw === undefined) return undefined;
      const entry = JSON.parse(raw);
      const age = this.now() - entry?.updatedAt;
      if (
        entry?.version !== VERSION ||
        typeof entry.updatedAt !== "number" ||
        !Number.isFinite(entry.updatedAt) ||
        !Object.hasOwn(entry, "data") ||
        age < 0 ||
        age >= MAX_AGE_MS
      ) {
        this.remove(key);
        return undefined;
      }
      return { data: entry.data as T, updatedAt: entry.updatedAt };
    } catch {
      this.remove(key);
      return undefined;
    }
  }

  async fetch<T>(key: string, ttlMs: number, loader: () => Promise<T>, force = false): Promise<T> {
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<T>;
    const cached = this.read<T>(key);
    if (!force && cached && this.now() - cached.updatedAt < ttlMs) return cached.data;

    const generation = this.generations.get(key) ?? 0;
    const request = Promise.resolve()
      .then(loader)
      .then((data) => {
        if ((this.generations.get(key) ?? 0) === generation) {
          try {
            this.storage.set(
              key,
              JSON.stringify({ version: VERSION, updatedAt: this.now(), data }),
            );
          } catch {
            // A full or unavailable disk cache must not fail a successful API request.
          }
        }
        return data;
      });
    this.pending.set(key, request);
    try {
      return await request;
    } finally {
      if (this.pending.get(key) === request) this.pending.delete(key);
    }
  }

  invalidate(key: string): void {
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
    this.pending.delete(key);
    this.remove(key);
  }

  invalidateAll(): void {
    for (const key of new Set([...this.generations.keys(), ...this.pending.keys()])) {
      this.invalidate(key);
    }
    try {
      this.storage.clear();
    } catch {
      // Cache availability must not prevent handling an authentication failure.
    }
  }

  write<T>(key: string, data: T): void {
    this.invalidate(key);
    try {
      this.storage.set(key, JSON.stringify({ version: VERSION, updatedAt: this.now(), data }));
    } catch {
      // A cache write failure does not undo a confirmed server mutation.
    }
  }

  private remove(key: string): void {
    try {
      this.storage.remove(key);
    } catch {
      // Cache availability is optional; invalid entries are never returned.
    }
  }
}
