/**
 * The on-disk projection cache: one JSON file per instance, holding the row model for every
 * application the instance returned.
 *
 * This is what makes the command render instantly. Raycast starts a command from cold every
 * time it is opened, so without a cache the first paint waits on a network round trip against
 * an instance holding thousands of applications. With it, the list paints from disk and the
 * refresh happens behind it.
 *
 * Writes go through a temporary file and a rename, because a command killed mid-write must not
 * leave a truncated cache that then has to be diagnosed.
 */

import type { AppSummary } from "../argocd/types";

/**
 * Bumped to 2 when resourceVersion left the entry: list responses are streamed now, and the
 * top-level metadata is never seen. A schema change discards old entries, which one refresh
 * rebuilds.
 */
export const CACHE_SCHEMA = 2;

export interface CacheEntry {
  schema: number;
  fetchedAt: number;
  apps: AppSummary[];
}

export interface CacheDeps {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, data: string) => Promise<void>;
  rename: (from: string, to: string) => Promise<void>;
  mkdir: (path: string) => Promise<void>;
  now: () => number;
}

export class ProjectionCache {
  constructor(
    private readonly rootDir: string,
    private readonly deps: CacheDeps,
  ) {}

  path(instanceId: string): string {
    // The id becomes a filename, so a value carrying a separator or a parent reference would
    // write outside the cache directory. Ids are generated, but this file is the last place
    // that can tell.
    if (instanceId.length === 0 || /[/\\]/.test(instanceId) || instanceId.includes("..")) {
      throw new Error("Refusing to use an instance id that is not a safe filename.");
    }
    return `${this.rootDir}/${instanceId}.json`;
  }

  async read(instanceId: string): Promise<CacheEntry | undefined> {
    let raw: string;
    try {
      raw = await this.deps.readFile(this.path(instanceId));
    } catch {
      return undefined;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return undefined;
    }
    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }

    const entry = parsed as Record<string, unknown>;
    // A cache from an older schema is discarded, never migrated: it is derived data that one
    // refresh rebuilds.
    if (entry.schema !== CACHE_SCHEMA) {
      return undefined;
    }
    if (typeof entry.fetchedAt !== "number" || !Array.isArray(entry.apps)) {
      return undefined;
    }

    const apps = entry.apps.filter(
      (app): app is AppSummary =>
        typeof app === "object" &&
        app !== null &&
        typeof (app as AppSummary).name === "string" &&
        (app as AppSummary).name.length > 0,
    );

    return { schema: CACHE_SCHEMA, fetchedAt: entry.fetchedAt, apps };
  }

  async write(instanceId: string, apps: AppSummary[]): Promise<void> {
    const target = this.path(instanceId);
    const entry: CacheEntry = { schema: CACHE_SCHEMA, fetchedAt: this.deps.now(), apps };

    await this.deps.mkdir(this.rootDir);
    const temporary = `${target}.tmp`;
    await this.deps.writeFile(temporary, JSON.stringify(entry));
    await this.deps.rename(temporary, target);
  }

  isStale(entry: CacheEntry | undefined, ttlSeconds: number): boolean {
    if (!entry) {
      return true;
    }
    return this.ageSeconds(entry) >= ttlSeconds;
  }

  ageSeconds(entry: CacheEntry): number {
    return Math.floor((this.deps.now() - entry.fetchedAt) / 1000);
  }
}
