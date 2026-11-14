import { Cache, LocalStorage } from "@raycast/api";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

import { appleMusicFetch, registerAccountCacheClearer } from "./apple-music-auth";
import { CatalogAlbum, CatalogPlaylist, CatalogSong } from "./models";

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
// Recommendations rotate on Apple's side far faster than the catalog does.
const RECOMMENDATIONS_TTL_MS = 60 * 60 * 1000;
// Documented fetch limit for ids= on catalog resources is 100 for albums
// (songs allow more); one conservative chunk size keeps both under it.
const MEMBERSHIP_BATCH_SIZE = 100;

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

interface PlaylistData {
  id: string;
  attributes?: {
    name?: string;
    curatorName?: string;
    url?: string;
    artwork?: { url?: string };
  };
}

const parsePlaylist = (p: PlaylistData, fromLibrary = false): CatalogPlaylist => ({
  id: p.id,
  title: p.attributes?.name ?? "",
  curator: p.attributes?.curatorName ?? (fromLibrary ? "Your Library" : ""),
  artwork: p.attributes?.artwork?.url ?? null,
  url: p.attributes?.url ?? null,
  fromLibrary,
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

/** Batched form of the `include=library` membership check: which of these
 * catalog ids map into the user's library. One request per chunk of 100 ids;
 * never cached for the same reason `isInLibrary` isn't. */
export const getLibraryMembership = (kind: "albums" | "songs", ids: string[]): TE.TaskEither<Error, Set<string>> =>
  TE.tryCatch(async () => {
    const found = new Set<string>();
    if (ids.length === 0) return found;
    const storefront = await getStorefront();
    for (let i = 0; i < ids.length; i += MEMBERSHIP_BATCH_SIZE) {
      const group = ids.slice(i, i + MEMBERSHIP_BATCH_SIZE);
      const res = await fetchWithRetry(
        `/v1/catalog/${storefront}/${kind}?ids=${group.map(encodeURIComponent).join(",")}&include=library`,
      );
      if (!res.ok) throw new Error(`Apple Music API ${res.status}`);
      const json = (await res.json()) as {
        data?: { id: string; relationships?: { library?: { data?: unknown[] } } }[];
      };
      for (const item of json.data ?? []) {
        if ((item.relationships?.library?.data?.length ?? 0) > 0) found.add(item.id);
      }
    }
    return found;
  }, E.toError);

export interface LibraryPlaylistLink {
  /** The library-playlists id (p.…). */
  libraryId: string;
  /** True for the user's own playlists; false for Apple Music playlists
   * (and other people's shared ones) added to the library. */
  canEdit: boolean;
}

interface LibraryPlaylistsResponse {
  next?: string;
  data?: {
    id: string;
    attributes?: { canEdit?: boolean; playParams?: { globalId?: string } };
    relationships?: { catalog?: { data?: { id: string }[] } };
  }[];
}

/** Every library playlist that has a catalog counterpart, keyed by that
 * catalog id (pl.…): Apple Music playlists the user added, and the user's
 * own playlists that have been shared. Playlists have no `include=library`
 * linkage on the catalog side, so this is the only way to answer "is this
 * recommended playlist in the library?" — and, via `canEdit`, "is it the
 * user's own?". Never cached, for the same reason the membership checks
 * aren't. */
export const getLibraryPlaylistLinks = (): TE.TaskEither<Error, Map<string, LibraryPlaylistLink>> =>
  TE.tryCatch(async () => {
    const links = new Map<string, LibraryPlaylistLink>();
    let path: string | undefined = "/v1/me/library/playlists?limit=100&include=catalog";
    while (path) {
      const res = await fetchWithRetry(path);
      if (!res.ok) throw new Error(`Apple Music API ${res.status}`);
      const json = (await res.json()) as LibraryPlaylistsResponse;
      for (const item of json.data ?? []) {
        const catalogId = item.attributes?.playParams?.globalId ?? item.relationships?.catalog?.data?.[0]?.id;
        if (catalogId) links.set(catalogId, { libraryId: item.id, canEdit: Boolean(item.attributes?.canEdit) });
      }
      path = json.next;
    }
    return links;
  }, E.toError);

export interface RecommendationRoom {
  id: string;
  /** Apple's display title for the room, e.g. "Made for You" or "New Releases". */
  title: string;
  albums: CatalogAlbum[];
  playlists: CatalogPlaylist[];
  songs: CatalogSong[];
}

type RecommendationContent = { type?: string } & (SongData | AlbumData | PlaylistData);

interface RecommendationsResponse {
  data?: {
    id: string;
    attributes?: { title?: { stringForDisplay?: string } };
    relationships?: { contents?: { data?: RecommendationContent[] } };
  }[];
}

/** The user's personal recommendation rooms (the public slice of the app's
 * Home tab). Which rooms come back — and their order — is entirely Apple's
 * call and shifts over time; content types we can't render or add (stations,
 * music videos) are dropped, and rooms left empty by that are omitted. The
 * user's own playlists can appear as `library-playlists` (e.g. in Recently
 * Played) and are kept, flagged so the UI skips Add to Library for them. */
export const getRecommendations = (): TE.TaskEither<Error, RecommendationRoom[]> =>
  TE.tryCatch(async () => {
    const json = await cachedGet<RecommendationsResponse>("/v1/me/recommendations", RECOMMENDATIONS_TTL_MS);
    const rooms: RecommendationRoom[] = [];
    for (const rec of json.data ?? []) {
      const room: RecommendationRoom = {
        id: rec.id,
        title: rec.attributes?.title?.stringForDisplay ?? "",
        albums: [],
        playlists: [],
        songs: [],
      };
      for (const item of rec.relationships?.contents?.data ?? []) {
        if (item.type === "albums") room.albums.push(parseAlbum(item as AlbumData));
        else if (item.type === "playlists") room.playlists.push(parsePlaylist(item as PlaylistData));
        else if (item.type === "library-playlists") room.playlists.push(parsePlaylist(item as PlaylistData, true));
        else if (item.type === "songs") room.songs.push(parseSong(item as SongData));
      }
      if (room.albums.length + room.playlists.length + room.songs.length > 0) rooms.push(room);
    }
    return rooms;
  }, E.toError);
