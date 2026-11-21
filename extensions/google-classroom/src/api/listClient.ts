import { createHash } from "node:crypto";

export type LoadOptions = { force?: boolean };
export type ListParams = Record<string, string | string[]>;
type Store = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): unknown;
};

export class ClassroomError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Cache complete lists, never individual pages or errors. Nothing runs in the background.
export function createListClient({
  cache,
  getToken,
  request = fetch,
  now = Date.now,
  report,
}: {
  cache: Store;
  getToken: () => string | Promise<string>;
  request?: typeof fetch;
  now?: () => number;
  report?: (event: {
    resource: string;
    source: "cache" | "network";
    requests: number;
    bytes: number;
    ms: number;
    headersMs?: number;
    bodyMs?: number;
    parseMs?: number;
    cacheWriteMs?: number;
  }) => void;
}) {
  const inFlight = new Map<string, { promise: Promise<unknown[]>; forced: boolean }>();

  return async function list<T>(
    path: string,
    key: string,
    params: ListParams = {},
    options: LoadOptions = {},
  ): Promise<T[]> {
    const started = now();
    const token = await getToken();
    const search = new URLSearchParams();
    for (const [name, value] of Object.entries(params).sort(([a], [b]) => a.localeCompare(b))) {
      for (const v of [value].flat()) search.append(name, v);
    }
    // A token fingerprint isolates accounts without storing credentials. Token rotation safely misses the cache.
    const cacheKey = createHash("sha256")
      .update(JSON.stringify([token, path, search.toString()]))
      .digest("hex");
    const pending = inFlight.get(cacheKey);
    // A refresh must not be answered by a request that started before it was asked for.
    if (pending && (pending.forced || !options.force)) return pending.promise as Promise<T[]>;
    if (!options.force) {
      try {
        const cached = cache.get(cacheKey);
        if (cached) {
          const entry = JSON.parse(cached) as { fetchedAt: number; items: T[] };
          const age = now() - entry.fetchedAt;
          if (age >= 0 && age < 30_000 && Array.isArray(entry.items)) {
            report?.({ resource: key || "course", source: "cache", requests: 0, bytes: 0, ms: now() - started });
            return entry.items;
          }
        }
      } catch {
        // An evicted or damaged cache must not prevent a fresh request.
      }
    }
    // A failed forced refresh must not leave an older entry eligible for reuse.
    try {
      cache.remove(cacheKey);
    } catch {
      /* cache is an optimization */
    }

    const load = async () => {
      const items: T[] = [];
      let pageToken: string | undefined;
      let requests = 0;
      let bytes = 0;
      let headersMs = 0,
        bodyMs = 0,
        parseMs = 0;
      do {
        if (pageToken) search.set("pageToken", pageToken);
        const fetchStarted = performance.now();
        const response = await request(`https://classroom.googleapis.com/v1/${path}?${search}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Accept-Encoding": "gzip",
            "User-Agent": "Raycast Google Classroom (gzip)",
          },
          signal: AbortSignal.timeout(20_000),
        });
        headersMs += performance.now() - fetchStarted;
        const bodyStarted = performance.now();
        const body = await response.text();
        bodyMs += performance.now() - bodyStarted;
        requests++;
        if (!response.ok) {
          let message = response.statusText;
          try {
            message = JSON.parse(body).error?.message ?? message;
          } catch {
            /* non-JSON gateway error */
          }
          throw new ClassroomError(message, response.status);
        }
        const parseStarted = performance.now();
        const data = JSON.parse(body) as { nextPageToken?: string } & Record<string, T[] | undefined>;
        parseMs += performance.now() - parseStarted;
        bytes += Buffer.byteLength(JSON.stringify(data));
        // An empty key denotes a single-resource GET (courses/{id}).
        items.push(...(key ? (data[key] ?? []) : [data as T]));
        pageToken = data.nextPageToken;
      } while (pageToken);
      // Age from the start: a slow multipage fetch must not extend freshness of its first page.
      const cacheStarted = performance.now();
      try {
        // A request superseded by a refresh holds older data than the refresh cached.
        if (inFlight.get(cacheKey) === entry) cache.set(cacheKey, JSON.stringify({ fetchedAt: started, items }));
      } catch {
        /* cache is an optimization */
      }
      report?.({
        resource: key || "course",
        source: "network",
        requests,
        bytes,
        ms: now() - started,
        headersMs,
        bodyMs,
        parseMs,
        cacheWriteMs: performance.now() - cacheStarted,
      });
      return items;
    };
    const entry = { promise: undefined as unknown as Promise<T[]>, forced: !!options.force };
    inFlight.set(cacheKey, entry);
    entry.promise = load();
    try {
      return await entry.promise;
    } finally {
      if (inFlight.get(cacheKey) === entry) inFlight.delete(cacheKey);
    }
  };
}
