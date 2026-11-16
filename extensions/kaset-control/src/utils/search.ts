// Search across YouTube Music (WEB_REMIX) and regular YouTube (WEB).
// Pure response parsers are exported for testing; the fetch wrappers sit below.

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

export type SearchResult = SongResult | VideoResult;

const YTM_BASE_URL = "https://music.youtube.com/youtubei/v1";
// Public YouTube Music web client key (not user-secret). This may rotate.
const YTM_API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
// WEB_REMIX client version used by youtubei search requests. This may rotate.
const YTM_CLIENT_VERSION = "1.20231204.01.00";

const YOUTUBE_BASE_URL = "https://www.youtube.com/youtubei/v1";
// Public YouTube web client key (not user-secret). This may rotate.
const YOUTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
// WEB client version used by YouTube search requests. This may rotate.
const YOUTUBE_CLIENT_VERSION = "2.20240101.00.00";

export function parseYouTubeMusicResults(
  response: Record<string, unknown>,
): SongResult[] {
  const renderers = collectRenderers(
    response,
    "musicResponsiveListItemRenderer",
  );
  const songs = renderers
    .map(parseSongRenderer)
    .filter((song): song is SongResult => song !== null);

  const uniqueById = new Map<string, SongResult>();
  for (const song of songs) {
    if (!uniqueById.has(song.id)) {
      uniqueById.set(song.id, song);
    }
  }

  return [...uniqueById.values()];
}

export function parseYouTubeResults(
  response: Record<string, unknown>,
): VideoResult[] {
  const renderers = collectRenderers(response, "videoRenderer");
  const videos = renderers
    .map(parseVideoRenderer)
    .filter((video): video is VideoResult => video !== null);

  const uniqueById = new Map<string, VideoResult>();
  for (const video of videos) {
    if (!uniqueById.has(video.id)) {
      uniqueById.set(video.id, video);
    }
  }

  return [...uniqueById.values()];
}

function parseVideoRenderer(
  renderer: Record<string, unknown>,
): VideoResult | null {
  const id = asString(renderer["videoId"]);
  if (!id) return null;

  return {
    source: "youtube",
    id,
    title: extractTextRuns(asRecord(renderer["title"])) ?? "Unknown Title",
    channel:
      extractTextRuns(asRecord(renderer["ownerText"])) ?? "Unknown Channel",
    duration: asString(asRecord(renderer["lengthText"])?.["simpleText"]),
    artworkURL: extractDirectThumbnailURL(renderer),
  };
}

export function mergeSearchResults(
  songs: SongResult[],
  videos: VideoResult[],
): SearchResult[] {
  const merged: SearchResult[] = [];
  const max = Math.max(songs.length, videos.length);
  for (let index = 0; index < max; index += 1) {
    const song = songs[index];
    const video = videos[index];
    if (song) merged.push(song);
    if (video) merged.push(video);
  }
  return merged;
}

export async function searchYouTubeMusic(query: string): Promise<SongResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const response = await fetch(
    `${YTM_BASE_URL}/search?key=${YTM_API_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://music.youtube.com",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: YTM_CLIENT_VERSION,
            hl: "en",
            gl: "US",
          },
        },
        query: trimmedQuery,
        params: "EgWKAQIIAWoMEA4QChADEAQQCRAF",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  return parseYouTubeMusicResults(json);
}

export async function searchYouTube(query: string): Promise<VideoResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const response = await fetch(
    `${YOUTUBE_BASE_URL}/search?key=${YOUTUBE_API_KEY}&prettyPrint=false`,
    {
      method: "POST",
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
    },
  );

  if (!response.ok) {
    throw new Error(`Search failed (${response.status})`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  return parseYouTubeResults(json);
}

function parseSongRenderer(
  renderer: Record<string, unknown>,
): SongResult | null {
  const videoId = extractVideoIdFromRenderer(renderer);
  if (!videoId) return null;

  const title = extractFlexText(renderer, 0) ?? "Unknown Title";
  const subtitleText = extractFlexText(renderer, 1) ?? "";
  const subtitleParts = subtitleText
    .split(" • ")
    .map((part) => part.trim())
    .filter(Boolean);

  // Current YouTube Music responses carry the duration as the last subtitle
  // run and omit fixedColumns; older responses use fixedColumns.
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
    artist: subtitleParts[0] ?? "Unknown Artist",
    album: extractAlbumFromRenderer(renderer) ?? subtitleParts[1],
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

function extractAlbumFromRenderer(
  renderer: Record<string, unknown>,
): string | undefined {
  const flexColumns = asArray(renderer["flexColumns"]);
  for (const column of flexColumns) {
    const columnRenderer = asRecord(column);
    const flexRenderer = asRecord(
      columnRenderer?.["musicResponsiveListItemFlexColumnRenderer"],
    );
    const text = asRecord(flexRenderer?.["text"]);
    const runs = asArray(text?.["runs"]);
    for (const run of runs) {
      const runRecord = asRecord(run);
      const navigationEndpoint = asRecord(runRecord?.["navigationEndpoint"]);
      const browseEndpoint = asRecord(navigationEndpoint?.["browseEndpoint"]);
      const browseId = asString(browseEndpoint?.["browseId"]);
      if (
        browseId &&
        ALBUM_BROWSE_ID_PREFIXES.some((prefix) => browseId.startsWith(prefix))
      ) {
        const album = asString(runRecord?.["text"]);
        if (album) return album;
      }
    }
  }

  return undefined;
}

// Pick the album for a track from a set of search results: an exact video-id
// match wins, then a result by the same artist, then the first result that
// carries an album. Returns undefined when none of them has one.
export function pickAlbum(
  results: SongResult[],
  id: string,
  artist: string,
): string | undefined {
  const withAlbum = results.filter((result) => result.album);
  const byId = withAlbum.find((result) => result.id === id);
  if (byId?.album) return byId.album;

  const wanted = artist.trim().toLowerCase();
  if (wanted) {
    const byArtist = withAlbum.find((result) => {
      const got = result.artist.trim().toLowerCase();
      return got === wanted || got.includes(wanted) || wanted.includes(got);
    });
    if (byArtist?.album) return byArtist.album;
  }

  return withAlbum[0]?.album;
}

function collectRenderers(
  node: unknown,
  rendererKey: string,
  collected: Record<string, unknown>[] = [],
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

function extractVideoIdFromRenderer(
  renderer: Record<string, unknown>,
): string | null {
  const playlistItemData = asRecord(renderer["playlistItemData"]);
  const fromPlaylistData = asString(playlistItemData?.["videoId"]);
  if (fromPlaylistData) return fromPlaylistData;

  const directNavigation = asRecord(renderer["navigationEndpoint"]);
  const fromDirectNavigation = extractVideoIdFromNavigation(directNavigation);
  if (fromDirectNavigation) return fromDirectNavigation;

  const flexColumns = asArray(renderer["flexColumns"]);
  for (const column of flexColumns) {
    const columnRenderer = asRecord(column);
    const flexRenderer = asRecord(
      columnRenderer?.["musicResponsiveListItemFlexColumnRenderer"],
    );
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

function extractVideoIdFromNavigation(
  navigationEndpoint: Record<string, unknown> | undefined,
): string | null {
  if (!navigationEndpoint) return null;
  const watchEndpoint = asRecord(navigationEndpoint["watchEndpoint"]);
  const videoId = asString(watchEndpoint?.["videoId"]);
  return videoId ?? null;
}

function extractFlexText(
  renderer: Record<string, unknown>,
  index: number,
): string | null {
  const flexColumns = asArray(renderer["flexColumns"]);
  const column = asRecord(flexColumns[index]);
  const flexRenderer = asRecord(
    column?.["musicResponsiveListItemFlexColumnRenderer"],
  );
  return extractTextRuns(asRecord(flexRenderer?.["text"]));
}

function extractFixedText(
  renderer: Record<string, unknown>,
  index: number,
): string | undefined {
  const fixedColumns = asArray(renderer["fixedColumns"]);
  const column = asRecord(fixedColumns[index]);
  const fixedRenderer = asRecord(
    column?.["musicResponsiveListItemFixedColumnRenderer"],
  );
  return extractTextRuns(asRecord(fixedRenderer?.["text"])) ?? undefined;
}

function extractTextRuns(
  text: Record<string, unknown> | undefined,
): string | null {
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

function extractThumbnailURL(
  renderer: Record<string, unknown>,
): string | undefined {
  const thumbnail = asRecord(renderer["thumbnail"]);
  const musicThumbnailRenderer = asRecord(
    thumbnail?.["musicThumbnailRenderer"],
  );
  const thumbnailData = asRecord(musicThumbnailRenderer?.["thumbnail"]);
  const thumbnails = asArray(thumbnailData?.["thumbnails"]);
  const lastThumbnail = asRecord(thumbnails[thumbnails.length - 1]);
  return asString(lastThumbnail?.["url"]) ?? undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  return value as Record<string, unknown>;
}

function extractDirectThumbnailURL(
  renderer: Record<string, unknown>,
): string | undefined {
  const thumbnail = asRecord(renderer["thumbnail"]);
  const thumbnails = asArray(thumbnail?.["thumbnails"]);
  const lastThumbnail = asRecord(thumbnails[thumbnails.length - 1]);
  return asString(lastThumbnail?.["url"]) ?? undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
