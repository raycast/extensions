// YouTube Music search over the public `youtubei` endpoint. The endpoint and its
// response shape are undocumented, so parsing is defensive and keyed to the
// renderer names the web client itself consumes.

export interface SongResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  artworkURL?: string;
}

// Video ids are interpolated into injected JavaScript and CSS selectors, so
// only an exact 11-character YouTube id is accepted.
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

// The `youtubei` endpoint is shared, and the client name decides the response
// shape: WEB_REMIX against www.youtube.com returns the same music renderers as
// music.youtube.com, but its edge completes the TLS handshake roughly twice as
// fast, which is the bulk of a cold search.
const BASE_URL = "https://www.youtube.com/youtubei/v1";
// Public YouTube web client key (not user-secret). This may rotate.
const API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
// WEB_REMIX client version used by youtubei search requests. This may rotate.
const CLIENT_VERSION = "1.20231204.01.00";
// Restricts search results to songs. The app's default search page is a mixed
// result set that omits most of these rows, so the queue flow must open the same
// filtered view to find the track it already showed in Play Song.
export const SONGS_FILTER_PARAMS = "EgWKAQIIAWoMEA4QChADEAQQCRAF";

export function parseYouTubeMusicResults(response: Record<string, unknown>): SongResult[] {
  const renderers = collectRenderers(response, "musicResponsiveListItemRenderer");
  const songs = renderers.map(parseSongRenderer).filter((song): song is SongResult => song !== null);

  const uniqueById = new Map<string, SongResult>();
  for (const song of songs) {
    if (!uniqueById.has(song.id)) {
      uniqueById.set(song.id, song);
    }
  }

  return [...uniqueById.values()];
}

export async function searchYouTubeMusic(query: string, signal?: AbortSignal): Promise<SongResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const response = await fetch(`${BASE_URL}/search?key=${API_KEY}&prettyPrint=false`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: CLIENT_VERSION,
          hl: "en",
          gl: "US",
        },
      },
      query: trimmedQuery,
      params: SONGS_FILTER_PARAMS,
    }),
  });

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  return parseYouTubeMusicResults(json);
}

/**
 * Album art for the current queue, keyed by video id.
 *
 * The app lazy-loads queue thumbnails, so rows the user has not scrolled to only
 * carry a 1x1 placeholder in the DOM. The `next` response is where the app gets
 * the real square artwork, so read it from there instead.
 */
export async function fetchQueueArtwork(videoId: string, playlistId: string | undefined): Promise<Map<string, string>> {
  if (!isVideoId(videoId)) return new Map();

  const response = await fetch(`${BASE_URL}/next?key=${API_KEY}&prettyPrint=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: CLIENT_VERSION,
          hl: "en",
          gl: "US",
        },
      },
      videoId,
      ...(playlistId ? { playlistId } : {}),
    }),
  });

  if (!response.ok) return new Map();

  const json = (await response.json()) as Record<string, unknown>;
  const artwork = new Map<string, string>();

  for (const panel of collectRenderers(json, "playlistPanelRenderer")) {
    for (const item of asArray(panel["contents"])) {
      const renderer = asRecord(asRecord(item)?.["playlistPanelVideoRenderer"]);
      const id = asString(renderer?.["videoId"]);
      const thumbnail = asRecord(renderer?.["thumbnail"]);
      const thumbnails = asArray(thumbnail?.["thumbnails"]);
      const url = asString(asRecord(thumbnails[thumbnails.length - 1])?.["url"]);
      if (id && url) artwork.set(id, url);
    }
  }

  return artwork;
}

// Warm DNS and TLS while the command opens, so the first query does not pay the
// cold-connection cost. Fire and forget.
export function warmYouTubeMusicConnection(): void {
  void fetch("https://www.youtube.com/generate_204", { method: "HEAD" }).catch(() => undefined);
}

function parseSongRenderer(renderer: Record<string, unknown>): SongResult | null {
  const videoId = extractVideoIdFromRenderer(renderer);
  if (!videoId || !isVideoId(videoId)) return null;

  // A row can be collected before its flex columns hydrate. Its placeholder
  // title would then be cached and shown as if it were a real result.
  const title = extractFlexText(renderer, 0)?.trim();
  if (!title) return null;

  const subtitleText = extractFlexText(renderer, 1) ?? "";
  const subtitleParts = subtitleText
    .split(" • ")
    .map((part) => part.trim())
    .filter(Boolean);

  // Current YouTube Music responses carry the duration as the last subtitle run
  // and omit fixedColumns; older responses use fixedColumns.
  let duration = extractFixedText(renderer, 0);
  const lastPart = subtitleParts[subtitleParts.length - 1];
  if (lastPart && /^\d+:\d+(?::\d+)?$/.test(lastPart)) {
    duration = duration ?? lastPart;
    subtitleParts.pop();
  }

  return {
    id: videoId,
    title,
    artist: subtitleParts[0] ?? "",
    // The positional subtitle fallback can point at a year, view count, or the
    // duration, so only the album browse endpoint is trusted.
    album: extractAlbumFromRenderer(renderer),
    duration,
    artworkURL: extractThumbnailURL(renderer),
  };
}

// A search result's album link is a subtitle run whose browse endpoint points at
// an album page. Album browse ids are prefixed MPRE (music albums) and OLAK
// (audiobooks/albums); the run carrying one is authoritative, unlike the
// positional subtitle split, which assumes a fixed "artist • album • duration"
// order.
const ALBUM_BROWSE_ID_PREFIXES = ["MPRE", "OLAK"];

function extractAlbumFromRenderer(renderer: Record<string, unknown>): string | undefined {
  const flexColumns = asArray(renderer["flexColumns"]);
  for (const column of flexColumns) {
    const columnRenderer = asRecord(column);
    const flexRenderer = asRecord(columnRenderer?.["musicResponsiveListItemFlexColumnRenderer"]);
    const text = asRecord(flexRenderer?.["text"]);
    const runs = asArray(text?.["runs"]);
    for (const run of runs) {
      const runRecord = asRecord(run);
      const navigationEndpoint = asRecord(runRecord?.["navigationEndpoint"]);
      const browseEndpoint = asRecord(navigationEndpoint?.["browseEndpoint"]);
      const browseId = asString(browseEndpoint?.["browseId"]);
      if (browseId && ALBUM_BROWSE_ID_PREFIXES.some((prefix) => browseId.startsWith(prefix))) {
        const album = asString(runRecord?.["text"]);
        if (album) return album;
      }
    }
  }

  return undefined;
}

function collectRenderers(
  node: unknown,
  rendererKey: string,
  collected: Record<string, unknown>[] = []
): Record<string, unknown>[] {
  if (!node || typeof node !== "object") return collected;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectRenderers(item, rendererKey, collected);
    }
    return collected;
  }

  const nodeRecord = node as Record<string, unknown>;
  const renderer = nodeRecord[rendererKey];
  if (renderer && typeof renderer === "object" && !Array.isArray(renderer)) {
    collected.push(renderer as Record<string, unknown>);
  }

  for (const value of Object.values(nodeRecord)) {
    collectRenderers(value, rendererKey, collected);
  }

  return collected;
}

function extractVideoIdFromRenderer(renderer: Record<string, unknown>): string | null {
  const playlistItemData = asRecord(renderer["playlistItemData"]);
  const fromPlaylistData = asString(playlistItemData?.["videoId"]);
  if (fromPlaylistData) return fromPlaylistData;

  const directNavigation = asRecord(renderer["navigationEndpoint"]);
  const fromDirectNavigation = extractVideoIdFromNavigation(directNavigation);
  if (fromDirectNavigation) return fromDirectNavigation;

  const flexColumns = asArray(renderer["flexColumns"]);
  for (const column of flexColumns) {
    const columnRenderer = asRecord(column);
    const flexRenderer = asRecord(columnRenderer?.["musicResponsiveListItemFlexColumnRenderer"]);
    const text = asRecord(flexRenderer?.["text"]);
    const runs = asArray(text?.["runs"]);
    for (const run of runs) {
      const runRecord = asRecord(run);
      const navigationEndpoint = asRecord(runRecord?.["navigationEndpoint"]);
      const videoId = extractVideoIdFromNavigation(navigationEndpoint);
      if (videoId) return videoId;
    }
  }

  return null;
}

function extractVideoIdFromNavigation(navigationEndpoint: Record<string, unknown> | undefined): string | null {
  if (!navigationEndpoint) return null;
  const watchEndpoint = asRecord(navigationEndpoint["watchEndpoint"]);
  const videoId = asString(watchEndpoint?.["videoId"]);
  return videoId ?? null;
}

function extractFlexText(renderer: Record<string, unknown>, index: number): string | null {
  const flexColumns = asArray(renderer["flexColumns"]);
  const column = asRecord(flexColumns[index]);
  const flexRenderer = asRecord(column?.["musicResponsiveListItemFlexColumnRenderer"]);
  return extractTextRuns(asRecord(flexRenderer?.["text"]));
}

function extractFixedText(renderer: Record<string, unknown>, index: number): string | undefined {
  const fixedColumns = asArray(renderer["fixedColumns"]);
  const column = asRecord(fixedColumns[index]);
  const fixedRenderer = asRecord(column?.["musicResponsiveListItemFixedColumnRenderer"]);
  return extractTextRuns(asRecord(fixedRenderer?.["text"])) ?? undefined;
}

function extractTextRuns(text: Record<string, unknown> | undefined): string | null {
  if (!text) return null;
  const runs = asArray(text["runs"]);
  if (runs.length > 0) {
    const joined = runs
      .map((run) => asString(asRecord(run)?.["text"]))
      .filter((run): run is string => Boolean(run))
      .join("");
    return joined || null;
  }

  return asString(text["simpleText"]) ?? null;
}

function extractThumbnailURL(renderer: Record<string, unknown>): string | undefined {
  const thumbnail = asRecord(renderer["thumbnail"]);
  const musicThumbnailRenderer = asRecord(thumbnail?.["musicThumbnailRenderer"]);
  const thumbnailData = asRecord(musicThumbnailRenderer?.["thumbnail"]);
  const thumbnails = asArray(thumbnailData?.["thumbnails"]);
  const lastThumbnail = asRecord(thumbnails[thumbnails.length - 1]);
  return asString(lastThumbnail?.["url"]) ?? undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
