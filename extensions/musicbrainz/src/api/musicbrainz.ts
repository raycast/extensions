import { Cache, environment, showToast, Toast } from "@raycast/api";

import {
  EntityType,
  MBArtist,
  MBArtistSearchResponse,
  MBLabel,
  MBLabelSearchResponse,
  MBRecording,
  MBRecordingSearchResponse,
  MBRelease,
  MBReleaseGroupFull,
  MBReleaseGroupSearchResponse,
  MBReleaseSearchResponse,
  MBWork,
  MBWorkSearchResponse,
  SearchResponse,
  SearchResult,
} from "../types";

const BASE_URL = "https://musicbrainz.org/ws/2";
const USER_AGENT = `Raycast/${environment.raycastVersion} (https://raycast.com)`;

const cache = new Cache();
const CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

function getCached<T>(key: string): T | undefined {
  const raw = cache.get(key);

  if (!raw) {
    return undefined;
  }

  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;

    if (Date.now() - entry.timestamp > CACHE_MAX_AGE) {
      return undefined;
    }

    return entry.data;
  } catch {
    cache.remove(key);

    return undefined;
  }
}

function getStaleCached<T>(key: string): T | undefined {
  const raw = cache.get(key);

  if (!raw) {
    return undefined;
  }

  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;

    return entry.data;
  } catch {
    return undefined;
  }
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, JSON.stringify({ timestamp: Date.now(), data }));
}

const LOOKUP_INC: Record<EntityType, string> = {
  artist: "aliases+tags+genres+url-rels",
  release: "artists+labels+recordings+release-groups+tags+url-rels",
  recording: "artists+releases+isrcs+tags+url-rels+work-rels",
  "release-group": "artists+genres+releases+tags+url-rels",
  label: "aliases+genres+tags+url-rels",
  work: "aliases+tags+url-rels+artist-rels+recording-rels",
};

let lastRequestTime = 0;

async function rateLimitedFetch(url: string, signal?: AbortSignal): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const delay = Math.max(0, 1100 - elapsed);

  // Eagerly claim the time slot so concurrent calls queue up instead of
  // reading the same lastRequestTime and all sleeping the same short delay.
  lastRequestTime = now + delay;

  if (delay > 0) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, delay);

      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timeout);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }

  signal?.throwIfAborted();

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal,
  });

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error("MusicBrainz rate limit exceeded. Please wait a moment and try again.");
    }

    throw new Error(`MusicBrainz API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

export async function searchEntities(
  type: EntityType,
  query: string,
  limit = 25,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const params = new URLSearchParams({
    query,
    limit: String(limit),
    fmt: "json",
    dismax: "true",
  });

  try {
    const response = await rateLimitedFetch(`${BASE_URL}/${type}?${params}`, signal);
    const data = (await response.json()) as SearchResponse;

    return extractResults(type, data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({ style: Toast.Style.Failure, title: "Search failed", message });

    return [];
  }
}

export async function lookupEntity<T extends SearchResult>(
  type: EntityType,
  mbid: string,
  signal?: AbortSignal,
): Promise<T | null> {
  const cacheKey = `lookup:${type}:${mbid}`;
  const cached = getCached<T>(cacheKey);

  if (cached) {
    return cached;
  }

  const inc = LOOKUP_INC[type];
  const params = new URLSearchParams({ fmt: "json", inc });

  try {
    const response = await rateLimitedFetch(`${BASE_URL}/${type}/${mbid}?${params}`, signal);
    const data = (await response.json()) as T;

    setCache(cacheKey, data);

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    const stale = getStaleCached<T>(cacheKey);

    if (stale) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Using cached data",
        message: "Failed to fetch latest data",
      });

      return stale;
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    await showToast({ style: Toast.Style.Failure, title: "Lookup failed", message });

    return null;
  }
}

function extractResults(type: EntityType, data: SearchResponse): SearchResult[] {
  switch (type) {
    case "artist":
      return (data as MBArtistSearchResponse).artists ?? [];
    case "release":
      return (data as MBReleaseSearchResponse).releases ?? [];
    case "recording":
      return (data as MBRecordingSearchResponse).recordings ?? [];
    case "release-group":
      return (data as MBReleaseGroupSearchResponse)["release-groups"] ?? [];
    case "label":
      return (data as MBLabelSearchResponse).labels ?? [];
    case "work":
      return (data as MBWorkSearchResponse).works ?? [];
  }
}

export function getEntityName(type: EntityType, entity: SearchResult): string {
  switch (type) {
    case "artist":
      return (entity as MBArtist).name;
    case "release":
      return (entity as MBRelease).title;
    case "recording":
      return (entity as MBRecording).title;
    case "release-group":
      return (entity as MBReleaseGroupFull).title;
    case "label":
      return (entity as MBLabel).name;
    case "work":
      return (entity as MBWork).title;
  }
}

const ALL_ENTITY_TYPES: EntityType[] = ["artist", "release", "recording", "release-group", "label", "work"];

/**
 * Resolve an MBID to an entity. If entityType is provided, does a single lookup.
 * If null (bare MBID), checks the cache first, then tries each entity type until one succeeds.
 * Once the type is discovered, does a full lookupEntity to populate the cache.
 */
export async function resolveEntityByMbid(
  mbid: string,
  entityType: EntityType | null,
  signal?: AbortSignal,
): Promise<{ type: EntityType; entity: SearchResult } | null> {
  if (entityType) {
    const entity = await lookupEntity(entityType, mbid, signal);

    if (entity) {
      return { type: entityType, entity: { ...entity, score: 100 } as SearchResult };
    }

    return null;
  }

  // Check existing cache entries for this MBID
  for (const type of ALL_ENTITY_TYPES) {
    const cached = getCached<SearchResult>(`lookup:${type}:${mbid}`);

    if (cached) {
      return { type, entity: { ...cached, score: 100 } as SearchResult };
    }
  }

  // Bare MBID: try each type with a minimal fetch to discover the entity type.
  for (const type of ALL_ENTITY_TYPES) {
    if (signal?.aborted) {
      return null;
    }

    try {
      const response = await rateLimitedFetch(`${BASE_URL}/${type}/${mbid}?fmt=json`, signal);

      await response.json(); // validate it's a real entity

      // Found the type -- do a full lookup to populate the cache
      const entity = await lookupEntity(type, mbid, signal);

      if (entity) {
        return { type, entity: { ...entity, score: 100 } as SearchResult };
      }

      return null;
    } catch {
      // 404 or other error -- try next type
      continue;
    }
  }

  return null;
}

export function getEntityUrl(type: EntityType, mbid: string): string {
  return `https://musicbrainz.org/${type}/${mbid}`;
}

export interface DiscographyEntry {
  id: string;
  title: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "first-release-date"?: string;
}

export async function browseArtistReleaseGroups(artistId: string, signal?: AbortSignal): Promise<DiscographyEntry[]> {
  const cacheKey = `discography:${artistId}`;
  const cached = getCached<DiscographyEntry[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    artist: artistId,
    type: "album|ep|single",
    fmt: "json",
    limit: "100",
  });

  try {
    const response = await rateLimitedFetch(`${BASE_URL}/release-group?${params}`, signal);
    const data = (await response.json()) as { "release-groups": DiscographyEntry[] };
    const results = data["release-groups"] ?? [];

    setCache(cacheKey, results);

    return results;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    console.error("Failed to browse artist release groups:", error);

    return [];
  }
}

export async function fetchCoverArtUrl(
  type: "release" | "release-group",
  mbid: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const cacheKey = `cover:${type}:${mbid}`;
  const cached = getCached<string | null>(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  try {
    const url = `https://coverartarchive.org/${type}/${mbid}/front-500`;

    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal,
    });

    if (!response.ok) {
      setCache(cacheKey, null);

      return null;
    }

    setCache(cacheKey, url);

    return url;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    console.error("Failed to fetch cover art URL:", error);

    return null;
  }
}

export interface WikipediaResult {
  extract: string;
  url: string;
}

export async function fetchWikipediaExtract(
  relations: { type: string; url?: { resource: string } }[],
  signal?: AbortSignal,
): Promise<WikipediaResult | null> {
  const wikidataRel = relations.find((r) => r.type === "wikidata" && r.url?.resource);

  if (!wikidataRel?.url?.resource) {
    return null;
  }

  const wikidataId = wikidataRel.url.resource.split("/").pop();

  if (!wikidataId) {
    return null;
  }

  const cacheKey = `wiki:${wikidataId}`;
  const cached = getCached<WikipediaResult | null>(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  try {
    const wdUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&props=sitelinks&format=json`;

    const wdResponse = await fetch(wdUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal,
    });

    if (!wdResponse.ok) {
      return null;
    }

    const wdData = (await wdResponse.json()) as {
      entities: Record<string, { sitelinks?: Record<string, { title: string }> }>;
    };

    const title = wdData.entities[wikidataId]?.sitelinks?.enwiki?.title;

    if (!title) {
      return null;
    }

    const wpUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

    const wpResponse = await fetch(wpUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal,
    });

    if (!wpResponse.ok) {
      return null;
    }

    const wpData = (await wpResponse.json()) as { extract?: string };

    if (!wpData.extract) {
      return null;
    }

    const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    const result = { extract: wpData.extract, url: pageUrl };

    setCache(cacheKey, result);

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    console.error("Failed to fetch Wikipedia extract:", error);

    return null;
  }
}
