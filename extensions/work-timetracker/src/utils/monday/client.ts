import { mondayConfig } from "@monday/config";

interface GraphQLError {
  message: string;
  [key: string]: unknown;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

interface FetchOptions {
  /** If true, cache identical requests for ttlMs. */
  cache?: boolean;
  /** Time-to-live for the cache in milliseconds (default 5 minutes). */
  ttlMs?: number;
}

const CACHE: Map<string, { expires: number; promise: Promise<GraphQLResponse<unknown>> }> = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 min

export async function mondayFetch<T = unknown, V extends Record<string, unknown> = Record<string, unknown>>(
  query: string,
  variables?: V,
  opts: FetchOptions = {},
): Promise<GraphQLResponse<T>> {
  if (!mondayConfig.enabled) {
    throw new Error("Monday.com integration is disabled in preferences.");
  }
  const { apiKey } = mondayConfig;
  if (!apiKey) {
    throw new Error("Monday.com API key is missing.");
  }

  const cacheKey = opts.cache ? JSON.stringify({ query, variables }) : undefined;
  if (cacheKey) {
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.promise as Promise<GraphQLResponse<T>>;
    }
  }

  const fetchPromise: Promise<GraphQLResponse<T>> = fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  }).then(async (res) => {
    const json = (await res.json()) as GraphQLResponse<T>;
    if (json.errors && json.errors.length > 0) {
      const msg = json.errors.map((e) => e.message).join(" | ");
      throw new Error(`Monday API error: ${msg}`);
    }
    return json;
  });

  if (cacheKey) {
    CACHE.set(cacheKey, {
      expires: Date.now() + (opts.ttlMs ?? DEFAULT_TTL),
      promise: fetchPromise as Promise<GraphQLResponse<unknown>>,
    });
  }

  return fetchPromise;
}
