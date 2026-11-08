// YouTube Music search over the public `youtubei` endpoint. The endpoint and its
// response shape are undocumented, so parsing is defensive and keyed to the
// renderer names the web client itself consumes.

export interface SongResult {
  source: "ytmusic";
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  artworkURL?: string;
}

export interface VideoResult {
  source: "youtube";
  id: string;
  title: string;
  channel: string;
  duration?: string;
  artworkURL?: string;
}

export type SearchResult = SongResult | VideoResult | BrowseResult;

// A search row that opens a page rather than playing a video: an album, an
// artist, or a playlist.
export type BrowseKind = "album" | "artist" | "playlist";

export interface BrowseResult {
  source: "browse";
  kind: BrowseKind;
  /** MPRE… album, UC… artist, or VL… playlist browse id. */
  id: string;
  title: string;
  /** Album artist, playlist owner, or an artist's audience line. */
  subtitle?: string;
  /** Album release year, or a playlist's track count / view count. */
  detail?: string;
  /** Album or playlist queue, when the row carries one. Artists have none. */
  playlistId?: string;
  artworkURL?: string;
}

// Video ids are interpolated into injected JavaScript and CSS selectors, so
// only an exact 11-character YouTube id is accepted.
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

// Browse and playlist ids are interpolated into injected JavaScript the same
// way, so they get the same charset restriction.
const BROWSE_ID_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;

export function isBrowseId(value: string): boolean {
  return BROWSE_ID_PATTERN.test(value);
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
// The WEB client answers with `videoRenderer` rows instead of the music
// renderers, which is how regular YouTube videos join the same result list.
const YOUTUBE_CLIENT_VERSION = "2.20240101.00.00";
// Search scopes, taken from the filter chips the web client itself renders, so
// the params match what the app would send for the same chip. A malformed
// params string is silently ignored by the endpoint — it answers 200 with an
// unfiltered result page — so a scoped search asserts that a music shelf came
// back rather than trusting the request.
export const SEARCH_FILTER_PARAMS = {
  songs: "EgWKAQIIAWoMEA4QChADEAQQCRAF",
  albums: "EgWKAQIYAWoMEA4QChADEAQQCRAF",
  artists: "EgWKAQIgAWoMEA4QChADEAQQCRAF",
  playlists: "EgWKAQIoAWoMEA4QChADEAQQCRAF",
} as const;

export type MusicScope = keyof typeof SEARCH_FILTER_PARAMS;

// Restricts search results to songs. The app's default search page is a mixed
// result set that omits most of these rows, so the queue flow must open the same
// filtered view to find the track it already showed in Play Music.
export const SONGS_FILTER_PARAMS = SEARCH_FILTER_PARAMS.songs;

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

export async function searchMusicScope(
  query: string,
  scope: Exclude<MusicScope, "songs">,
  signal?: AbortSignal
): Promise<BrowseResult[]> {
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
      params: SEARCH_FILTER_PARAMS[scope],
    }),
  });

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }

  const json = (await response.json()) as Record<string, unknown>;

  // A music shelf is how a scoped page distinguishes itself from the unfiltered
  // one, which arrives with a top-result card and misc sections instead.
  if (collectRenderers(json, "musicShelfRenderer").length === 0) {
    throw new Error("YouTube Music ignored the search filter");
  }

  return parseBrowseResults(json);
}

export function parseYouTubeResults(response: Record<string, unknown>): VideoResult[] {
  const renderers = collectRenderers(response, "videoRenderer");
  const videos = renderers.map(parseVideoRenderer).filter((video): video is VideoResult => video !== null);

  const uniqueById = new Map<string, VideoResult>();
  for (const video of videos) {
    if (!uniqueById.has(video.id)) {
      uniqueById.set(video.id, video);
    }
  }

  return [...uniqueById.values()];
}

export async function searchYouTube(query: string, signal?: AbortSignal): Promise<VideoResult[]> {
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
          clientName: "WEB",
          clientVersion: YOUTUBE_CLIENT_VERSION,
          hl: "en",
          gl: "US",
        },
      },
      query: trimmedQuery,
    }),
  });

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  return parseYouTubeResults(json);
}

/**
 * Interleaves the two result lists by rank so the best match from each source is
 * visible without scrolling. A video that the music search already returned as a
 * song is dropped, because the song row carries the artist and album and plays
 * through the music tab.
 */
export function mergeSearchResults(songs: SongResult[], videos: VideoResult[]): SearchResult[] {
  const seen = new Set(songs.map((song) => song.id));
  const merged: SearchResult[] = [];
  const max = Math.max(songs.length, videos.length);

  for (let index = 0; index < max; index += 1) {
    const song = songs[index];
    const video = videos[index];
    if (song) merged.push(song);
    if (video && !seen.has(video.id)) {
      seen.add(video.id);
      merged.push(video);
    }
  }

  return merged;
}

const PAGE_TYPE_KIND: Record<string, BrowseKind> = {
  MUSIC_PAGE_TYPE_ALBUM: "album",
  MUSIC_PAGE_TYPE_ARTIST: "artist",
  MUSIC_PAGE_TYPE_PLAYLIST: "playlist",
};

export function parseBrowseResults(response: Record<string, unknown>): BrowseResult[] {
  const renderers = collectRenderers(response, "musicResponsiveListItemRenderer");
  const rows = renderers.map(parseBrowseRenderer).filter((row): row is BrowseResult => row !== null);

  const uniqueById = new Map<string, BrowseResult>();
  for (const row of rows) {
    if (!uniqueById.has(row.id)) {
      uniqueById.set(row.id, row);
    }
  }

  return [...uniqueById.values()];
}

/**
 * Albums, artists, and playlists all arrive as the same responsive renderer, so
 * the row's browse page type decides what it is. The subtitle is read run by run
 * rather than as joined text, because which run holds the artist or the owner
 * differs per type, and the leading label ("Album", "Single", "EP") localises.
 */
function parseBrowseRenderer(renderer: Record<string, unknown>): BrowseResult | null {
  const browseEndpoint = asRecord(asRecord(renderer["navigationEndpoint"])?.["browseEndpoint"]);
  const id = asString(browseEndpoint?.["browseId"]);
  if (!id) return null;

  const pageType = browsePageType(browseEndpoint);
  const kind = (pageType && PAGE_TYPE_KIND[pageType]) ?? kindFromBrowseId(id);
  // Podcast shows share the playlists shelf but are not playlists.
  if (!kind || pageType === "MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE") return null;

  const title = extractFlexText(renderer, 0)?.trim();
  if (!title) return null;

  const runs = flexRuns(renderer, 1);
  const withBrowse = runs.find((run) => run.browseId);

  if (kind === "album") {
    // "Album • <artist> • 2013": the artist run browses to a channel and the
    // year is the four-digit run.
    const artist = runs.find((run) => run.pageType === "MUSIC_PAGE_TYPE_ARTIST" || run.browseId?.startsWith("UC"));
    const year = runs.find((run) => /^\d{4}$/.test(run.text));
    return {
      source: "browse",
      kind,
      id,
      title,
      subtitle: artist?.text,
      detail: year?.text,
      playlistId: overlayPlaylistId(renderer),
      artworkURL: extractThumbnailURL(renderer),
    };
  }

  if (kind === "artist") {
    // "Artist • 68.1M monthly audience": the audience run carries no endpoint.
    const audience = runs[runs.length - 1];
    return {
      source: "browse",
      kind,
      id,
      title,
      subtitle: audience?.text,
      artworkURL: extractThumbnailURL(renderer),
    };
  }

  // Playlists: "<owner> • 711K views", or "<owner> • 35 songs" for curated ones.
  const detail = runs.find((run) => run !== withBrowse);
  return {
    source: "browse",
    kind,
    id,
    title,
    subtitle: withBrowse?.text,
    detail: detail?.text,
    playlistId: overlayPlaylistId(renderer) ?? id.slice(2),
    artworkURL: extractThumbnailURL(renderer),
  };
}

function browsePageType(browseEndpoint: Record<string, unknown> | undefined): string | undefined {
  const configs = asRecord(browseEndpoint?.["browseEndpointContextSupportedConfigs"]);
  return asString(asRecord(configs?.["browseEndpointContextMusicConfig"])?.["pageType"]);
}

function kindFromBrowseId(id: string): BrowseKind | undefined {
  if (id.startsWith("MPRE") || id.startsWith("OLAK")) return "album";
  if (id.startsWith("UC")) return "artist";
  if (id.startsWith("VL")) return "playlist";
  return undefined;
}

// Album and playlist rows expose their queue as a play button overlay rather
// than as a video id; this is the id the app itself would play.
function overlayPlaylistId(renderer: Record<string, unknown>): string | undefined {
  const overlay = asRecord(renderer["overlay"]);
  const item = asRecord(overlay?.["musicItemThumbnailOverlayRenderer"]);
  const content = asRecord(item?.["content"]);
  const button = asRecord(content?.["musicPlayButtonRenderer"]);
  const endpoint = asRecord(button?.["playNavigationEndpoint"]);
  return asString(asRecord(endpoint?.["watchPlaylistEndpoint"])?.["playlistId"]);
}

interface FlexRun {
  text: string;
  browseId?: string;
  pageType?: string;
}

function flexRuns(renderer: Record<string, unknown>, index: number): FlexRun[] {
  const flexColumns = asArray(renderer["flexColumns"]);
  const column = asRecord(flexColumns[index]);
  const flexRenderer = asRecord(column?.["musicResponsiveListItemFlexColumnRenderer"]);
  const text = asRecord(flexRenderer?.["text"]);

  const runs: FlexRun[] = [];
  for (const run of asArray(text?.["runs"])) {
    const record = asRecord(run);
    const value = asString(record?.["text"])?.trim();
    // Separators are their own runs; the joined form splits on " • ".
    if (!value || value === "•") continue;
    const browseEndpoint = asRecord(asRecord(record?.["navigationEndpoint"])?.["browseEndpoint"]);
    runs.push({
      text: value,
      browseId: asString(browseEndpoint?.["browseId"]),
      pageType: browsePageType(browseEndpoint),
    });
  }

  return runs;
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
    source: "ytmusic",
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

function parseVideoRenderer(renderer: Record<string, unknown>): VideoResult | null {
  const id = asString(renderer["videoId"]);
  if (!id || !isVideoId(id)) return null;

  // A row can be collected before its text runs hydrate, and a placeholder title
  // would then be cached and shown as if it were a real result.
  const title = extractTextRuns(asRecord(renderer["title"]))?.trim();
  if (!title) return null;

  return {
    source: "youtube",
    id,
    title,
    channel: extractTextRuns(asRecord(renderer["ownerText"])) ?? "",
    duration: asString(asRecord(renderer["lengthText"])?.["simpleText"]),
    artworkURL: extractDirectThumbnailURL(renderer),
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

// Plain YouTube rows carry their thumbnails as a bare `thumbnail.thumbnails`
// list rather than the music thumbnail renderer.
function extractDirectThumbnailURL(renderer: Record<string, unknown>): string | undefined {
  const thumbnail = asRecord(renderer["thumbnail"]);
  const thumbnails = asArray(thumbnail?.["thumbnails"]);
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
