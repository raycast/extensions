import { Cache } from "@raycast/api";

const API_URL = "https://crt.name/v1/search";
const CACHE_TTL_MS = 15 * 60 * 1000;
const searchCache = new Cache({ namespace: "apex-search", capacity: 25 * 1024 * 1024 });

type ApiResult = {
  first_seen: string | null;
  sub: string;
};

export type SubdomainRecord = {
  firstSeen: string | null;
  subdomain: string;
};

export type SearchResponse = {
  apex: string;
  results: SubdomainRecord[];
};

export function normalizeApex(value: string): string {
  const input = value.trim().toLowerCase();
  if (!input) {
    throw new Error("Enter an apex domain, such as example.com.");
  }

  let hostname: string;
  try {
    hostname = new URL(input.includes("://") ? input : `https://${input}`).hostname;
  } catch {
    throw new Error("Enter a valid apex domain, such as example.com.");
  }

  hostname = hostname.replace(/^\*\./, "").replace(/\.$/, "");
  const labels = hostname.split(".");
  const isValid =
    hostname.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9-]+$/.test(label) &&
        !label.startsWith("-") &&
        !label.endsWith("-"),
    );

  if (!isValid) {
    throw new Error("Enter a valid apex domain, such as example.com.");
  }

  return hostname;
}

function isApiResult(value: unknown): value is ApiResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Record<string, unknown>;
  return typeof result.sub === "string" && (typeof result.first_seen === "string" || result.first_seen === null);
}

function isSearchResponse(value: unknown): value is SearchResponse {
  if (!value || typeof value !== "object") return false;

  const response = value as Record<string, unknown>;
  return (
    typeof response.apex === "string" &&
    Array.isArray(response.results) &&
    response.results.every((result) => {
      if (!result || typeof result !== "object") return false;

      const record = result as Record<string, unknown>;
      return (
        typeof record.subdomain === "string" && (typeof record.firstSeen === "string" || record.firstSeen === null)
      );
    })
  );
}

function cacheKey(apex: string): string {
  return `v1:${apex}`;
}

function getCachedSearch(apex: string): SearchResponse | undefined {
  const key = cacheKey(apex);
  const cached = searchCache.get(key);
  if (!cached) return undefined;

  try {
    const entry: unknown = JSON.parse(cached);
    if (!entry || typeof entry !== "object") throw new Error("Invalid cache entry");

    const { cachedAt, response } = entry as Record<string, unknown>;
    if (typeof cachedAt !== "number" || !isSearchResponse(response)) throw new Error("Invalid cache entry");
    if (Date.now() - cachedAt >= CACHE_TTL_MS) return undefined;

    return response;
  } catch {
    searchCache.remove(key);
    return undefined;
  }
}

export function invalidateApexCache(input: string): void {
  searchCache.remove(cacheKey(normalizeApex(input)));
}

export async function searchApex(input: string): Promise<SearchResponse> {
  const apex = normalizeApex(input);
  const cached = getCachedSearch(apex);
  if (cached) return cached;

  const url = new URL(API_URL);
  url.searchParams.set("apex", apex);
  url.searchParams.set("format", "json");
  url.searchParams.set("dates", "1");

  const response = await fetch(url);
  if (!response.ok) {
    const message = (await response.text()).trim();
    throw new Error(message || `crt.name returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isApiResult)) {
    throw new Error("crt.name returned an unexpected response.");
  }

  const result = {
    apex,
    results: payload.map((result) => ({
      firstSeen: result.first_seen,
      subdomain: result.sub,
    })),
  };

  searchCache.set(cacheKey(apex), JSON.stringify({ cachedAt: Date.now(), response: result }));
  return result;
}
