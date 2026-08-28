import { Cache, LocalStorage } from "@raycast/api";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

import { appleMusicFetch, registerAccountCacheClearer } from "./apple-music-auth";
import { CatalogAlbum, CatalogSong } from "./models";

// Shared Apple Music catalog client: storefront resolution, 429 backoff
// honouring Retry-After, and a day cache for GETs (the catalog changes on
// the scale of days). Library writes and membership checks are never cached.
// The public surface is TaskEither to match the rest of the codebase; the
// fetch plumbing underneath stays promise-based.

const SEARCH_LIMIT = 25;
const MAX_RETRIES = 5;
const RETRY_FLOOR_MS = 500;
const RETRY_CEILING_MS = 60_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const cache = new Cache({ namespace: "catalog-api" });
const STOREFRONT_KEY = "catalog-storefront";

// The storefront and every cached /v1/me response are account-scoped: a new
// sign-in must not inherit the previous account's regional catalog or
// personalized feeds. Dropping the whole response cache also costs the
// catalog day-cache, which is an acceptable price for an event this rare.
//
// The generation counter closes the race the clearer alone leaves open: a
// lookup already in flight when the account changes would otherwise persist
// the old account's response after the caches were wiped. Anything started
// under an older generation may still return its result, but must not store it.
let accountGeneration = 0;

registerAccountCacheClearer(() => {
  accountGeneration++;
  cache.clear();
  return LocalStorage.removeItem(STOREFRONT_KEY);
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseRetryDelay(retryAfter: string | null, attempt: number): number {
  if (retryAfter) {
    const asNumber = Number(retryAfter);
    if (Number.isFinite(asNumber)) return Math.max(RETRY_FLOOR_MS, asNumber * 1000);
    const asDate = Date.parse(retryAfter);
    if (Number.isFinite(asDate)) return Math.max(RETRY_FLOOR_MS, asDate - Date.now());
  }
  return Math.min(RETRY_CEILING_MS, Math.max(RETRY_FLOOR_MS, 1000 * 2 ** attempt));
}

async function fetchWithRetry(path: string, init?: RequestInit): Promise<Response> {
  let attempt = 0;
  for (;;) {
    const res = await appleMusicFetch(path, init);
    if (res.status !== 429 || attempt >= MAX_RETRIES) return res;
    await sleep(parseRetryDelay(res.headers.get("Retry-After"), attempt));
    attempt++;
  }
}

/** TTL-cached GET returning parsed JSON. Cache key is the request path. */
async function cachedGet<T>(path: string, ttlMs = CACHE_TTL_MS): Promise<T> {
  const hit = cache.get(path);
  if (hit) {
    try {
      const { at, data } = JSON.parse(hit) as { at: number; data: T };
      if (Date.now() - at < ttlMs) return data;
    } catch {
      // corrupt entry — refetch
    }
  }
  const generation = accountGeneration;
  const res = await fetchWithRetry(path);
  if (!res.ok) throw new Error(`Apple Music API ${res.status} for ${path.split("?")[0]}`);
  const data = (await res.json()) as T;
  if (generation === accountGeneration) cache.set(path, JSON.stringify({ at: Date.now(), data }));
  return data;
}

async function getStorefront(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(STOREFRONT_KEY);
  if (stored) return stored;
  const generation = accountGeneration;
  const res = await fetchWithRetry("/v1/me/storefront");
  if (!res.ok) throw new Error(`storefront lookup failed (${res.status})`);
  const json = (await res.json()) as { data?: { id: string }[] };
  const id = json.data?.[0]?.id;
  if (!id) throw new Error("storefront lookup returned no id");
  if (generation === accountGeneration) {
    await LocalStorage.setItem(STOREFRONT_KEY, id);
    // The account changed while the write was in flight — it may have landed
    // after the clearer's removal, so undo it.
    if (generation !== accountGeneration) await LocalStorage.removeItem(STOREFRONT_KEY);
  }
  return id;
}

/** Render an artwork URL template at a square pixel size. */
export function artworkUrl(template: string | null, size: number): string | null {
  return template ? template.replace("{w}", String(size)).replace("{h}", String(size)) : null;
}

const asContentRating = (raw: string | undefined): "clean" | "explicit" | null =>
  raw === "clean" || raw === "explicit" ? raw : null;

interface SongData {
  id: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    durationInMillis?: number;
    url?: string;
    artwork?: { url?: string };
    contentRating?: string;
    playParams?: { id?: string };
  };
}

interface AlbumData {
  id: string;
  attributes?: {
    name?: string;
    artistName?: string;
    trackCount?: number;
    releaseDate?: string;
    url?: string;
    artwork?: { url?: string };
    contentRating?: string;
  };
}

const parseSong = (s: SongData): CatalogSong => ({
  id: s.id,
  title: s.attributes?.name ?? "",
  artist: s.attributes?.artistName ?? "",
  album: s.attributes?.albumName ?? "",
  durationMs: s.attributes?.durationInMillis ?? null,
  artwork: s.attributes?.artwork?.url ?? null,
  url: s.attributes?.url ?? null,
  contentRating: asContentRating(s.attributes?.contentRating),
  playable: Boolean(s.attributes?.playParams),
});

const parseAlbum = (a: AlbumData): CatalogAlbum => ({
  id: a.id,
  title: a.attributes?.name ?? "",
  artist: a.attributes?.artistName ?? "",
  trackCount: a.attributes?.trackCount ?? 0,
  releaseDate: a.attributes?.releaseDate ?? null,
  artwork: a.attributes?.artwork?.url ?? null,
  url: a.attributes?.url ?? null,
  contentRating: asContentRating(a.attributes?.contentRating),
});

export interface CatalogSearchResults {
  songs: CatalogSong[];
  albums: CatalogAlbum[];
}

interface SearchResponse {
  results?: {
    songs?: { data?: SongData[] };
    albums?: { data?: AlbumData[] };
  };
}

export const searchCatalog = (term: string): TE.TaskEither<Error, CatalogSearchResults> =>
  TE.tryCatch(async () => {
    const storefront = await getStorefront();
    const path = `/v1/catalog/${storefront}/search?types=songs,albums&limit=${SEARCH_LIMIT}&term=${encodeURIComponent(term)}`;
    const json = await cachedGet<SearchResponse>(path);
    return {
      songs: (json.results?.songs?.data ?? []).map(parseSong),
      albums: (json.results?.albums?.data ?? []).map(parseAlbum),
    };
  }, E.toError);

export interface CatalogAlbumDetail {
  album: CatalogAlbum;
  tracks: CatalogSong[];
}

interface AlbumDetailResponse {
  data?: (AlbumData & { relationships?: { tracks?: { data?: SongData[] } } })[];
}

/** Album summary + full tracklist in one request. */
export const getCatalogAlbum = (albumId: string): TE.TaskEither<Error, CatalogAlbumDetail | null> =>
  TE.tryCatch(async () => {
    const storefront = await getStorefront();
    const json = await cachedGet<AlbumDetailResponse>(`/v1/catalog/${storefront}/albums/${albumId}?include=tracks`);
    const a = json.data?.[0];
    if (!a) return null;
    return {
      album: parseAlbum(a),
      tracks: (a.relationships?.tracks?.data ?? []).map(parseSong),
    };
  }, E.toError);

interface LibraryRelationshipResponse {
  data?: { relationships?: { library?: { data?: unknown[] } } }[];
}

/** Whether a catalog item maps into the user's library — Apple's own linkage,
 * via the `library` relationship on the catalog resource. Never cached: the
 * answer changes the moment the user adds the item.
 *
 * Known caveats (measured): the mapping is pinned to the originally-added
 * catalog edition, so a different edition of an owned album may not flag; and
 * uploaded/cloud-only items never link. */
export const isInLibrary = (kind: "albums" | "songs", id: string): TE.TaskEither<Error, boolean> =>
  TE.tryCatch(async () => {
    const storefront = await getStorefront();
    const res = await fetchWithRetry(`/v1/catalog/${storefront}/${kind}/${encodeURIComponent(id)}?include=library`);
    if (!res.ok) throw new Error(`Apple Music API ${res.status}`);
    const json = (await res.json()) as LibraryRelationshipResponse;
    return (json.data?.[0]?.relationships?.library?.data?.length ?? 0) > 0;
  }, E.toError);

/** Add a catalog song, album, or playlist to the user's library. Apple answers
 * 202 Accepted with an empty body; the item lands asynchronously via cloud
 * sync (normally seconds, occasionally minutes) — success copy must say it
 * will appear shortly, never that it is already there. */
export const addToLibrary = (kind: "songs" | "albums" | "playlists", id: string): TE.TaskEither<Error, void> =>
  TE.tryCatch(async () => {
    const res = await fetchWithRetry(`/v1/me/library?ids[${kind}]=${encodeURIComponent(id)}`, { method: "POST" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Apple Music API ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
  }, E.toError);
