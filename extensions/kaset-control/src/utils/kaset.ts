import { runAppleScript } from "@raycast/utils";
import { showHUD, showToast, Toast, open } from "@raycast/api";

// Player state types
export type PlayerState = "playing" | "paused" | "stopped";
export type RepeatMode = "off" | "all" | "one";

export interface Track {
  name: string;
  artist: string;
  album: string;
  duration: number;
  id: string;
  artworkURL: string;
}

export type LikeStatus = "liked" | "disliked" | "none";

export interface KasetState {
  playerState: PlayerState;
  volume: number;
  shuffling: boolean;
  repeating: RepeatMode;
  muted: boolean;
  position: number;
  duration: number;
  currentTrack: Track | null;
  likeStatus: LikeStatus;
}

export interface SearchSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  artworkURL?: string;
}

const YTM_BASE_URL = "https://music.youtube.com/youtubei/v1";
// Public YouTube Music web client key (not user-secret). This may rotate.
const YTM_API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
// WEB_REMIX client version used by youtubei search requests. This may rotate.
const YTM_CLIENT_VERSION = "1.20231204.01.00";

// Check if Kaset is running
export async function isKasetRunning(): Promise<boolean> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return (name of processes) contains "Kaset"
      end tell
    `);
    return result === "true";
  } catch {
    return false;
  }
}

// Launch Kaset if not running
export async function ensureKasetRunning(): Promise<boolean> {
  const running = await isKasetRunning();
  if (!running) {
    try {
      await open("kaset://");
      // Wait for app to launch
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return await isKasetRunning();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Kaset not installed",
        message: "Please install Kaset first",
      });
      return false;
    }
  }
  return true;
}

// Get player info via AppleScript command
async function getPlayerInfo(): Promise<KasetState | null> {
  if (!(await isKasetRunning())) return null;

  try {
    const result = await runAppleScript(
      `tell application "Kaset" to get player info`,
    );
    if (!result || result === "{}") return null;

    const state = JSON.parse(result);

    return {
      playerState: state.isPlaying
        ? "playing"
        : state.isPaused
          ? "paused"
          : "stopped",
      volume: state.volume ?? 0,
      shuffling: state.shuffling ?? false,
      repeating: (state.repeating ?? "off") as RepeatMode,
      muted: state.muted ?? false,
      position: state.position ?? 0,
      duration: state.duration ?? 0,
      likeStatus: (state.likeStatus ?? "none") as LikeStatus,
      currentTrack: state.currentTrack
        ? {
            name: state.currentTrack.name ?? "Unknown",
            artist: state.currentTrack.artist ?? "Unknown Artist",
            album: state.currentTrack.album ?? "",
            duration: state.currentTrack.duration ?? 0,
            id: state.currentTrack.videoId ?? "",
            artworkURL: state.currentTrack.artworkURL ?? "",
          }
        : null,
    };
  } catch (e) {
    console.error("Failed to get player info:", e);
    return null;
  }
}

// Play
export async function play(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  await runAppleScript(`tell application "Kaset" to play`);
  await showHUD("▶️ Playing");
}

// Pause
export async function pause(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  await runAppleScript(`tell application "Kaset" to pause`);
  await showHUD("⏸️ Paused");
}

// Toggle play/pause
export async function playPause(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const state = await getPlayerInfo();
  await runAppleScript(`tell application "Kaset" to playpause`);
  await showHUD(state?.playerState === "playing" ? "⏸️ Paused" : "▶️ Playing");
}

// Play a specific YouTube video by video ID
export async function playVideo(videoId: string): Promise<void> {
  const normalizedId = videoId.trim();
  if (!/^[a-zA-Z0-9_-]{6,}$/.test(normalizedId)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid video ID",
      message: "Please provide a valid YouTube video ID",
    });
    return;
  }

  if (!(await ensureKasetRunning())) return;
  await runAppleScript(
    `tell application "Kaset" to play video "${normalizedId}"`,
  );
  await showHUD("▶️ Playing selected song");
}

// Next track
export async function nextTrack(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  await runAppleScript(`tell application "Kaset" to next track`);
  await showHUD("⏭️ Next Track");
}

// Previous track
export async function previousTrack(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  await runAppleScript(`tell application "Kaset" to previous track`);
  await showHUD("⏮️ Previous Track");
}

// Set volume (0-100)
export async function setVolume(volume: number): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)));
  await runAppleScript(
    `tell application "Kaset" to set volume ${clampedVolume}`,
  );
  await showHUD(`🔊 Volume: ${clampedVolume}%`);
}

// Get volume
export async function getVolume(): Promise<number> {
  const state = await getPlayerInfo();
  return state?.volume ?? 0;
}

// Toggle shuffle
export async function toggleShuffle(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const stateBefore = await getPlayerInfo();
  await runAppleScript(`tell application "Kaset" to toggle shuffle`);
  // State flips, so show opposite of what it was
  await showHUD(stateBefore?.shuffling ? "➡️ Shuffle Off" : "🔀 Shuffle On");
}

// Cycle repeat mode
export async function cycleRepeat(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const stateBefore = await getPlayerInfo();
  await runAppleScript(`tell application "Kaset" to cycle repeat`);
  // Cycle: off -> all -> one -> off
  const nextMode =
    stateBefore?.repeating === "off"
      ? "All"
      : stateBefore?.repeating === "all"
        ? "One"
        : "Off";
  await showHUD(`🔁 Repeat: ${nextMode}`);
}

// Toggle mute
export async function toggleMute(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const stateBefore = await getPlayerInfo();
  await runAppleScript(`tell application "Kaset" to toggle mute`);
  await showHUD(stateBefore?.muted ? "🔊 Unmuted" : "🔇 Muted");
}

// Get player state
export async function getPlayerState(): Promise<PlayerState> {
  const state = await getPlayerInfo();
  return state?.playerState ?? "stopped";
}

// Get shuffling state
export async function getShuffling(): Promise<boolean> {
  const state = await getPlayerInfo();
  return state?.shuffling ?? false;
}

// Get repeat mode
export async function getRepeatMode(): Promise<RepeatMode> {
  const state = await getPlayerInfo();
  return state?.repeating ?? "off";
}

// Get muted state
export async function getMuted(): Promise<boolean> {
  const state = await getPlayerInfo();
  return state?.muted ?? false;
}

// Get player position
export async function getPosition(): Promise<number> {
  const state = await getPlayerInfo();
  return state?.position ?? 0;
}

// Get track duration
export async function getDuration(): Promise<number> {
  const state = await getPlayerInfo();
  return state?.duration ?? 0;
}

// Get current track
export async function getCurrentTrack(): Promise<Track | null> {
  const state = await getPlayerInfo();
  return state?.currentTrack ?? null;
}

// Get full player state
export async function getKasetState(): Promise<KasetState | null> {
  return await getPlayerInfo();
}

// Get like status
export async function getLikeStatus(): Promise<LikeStatus> {
  const state = await getPlayerInfo();
  return state?.likeStatus ?? "none";
}

// Like track (toggle)
export async function likeTrack(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const stateBefore = await getPlayerInfo();
  await runAppleScript(`tell application "Kaset" to like track`);
  await showHUD(
    stateBefore?.likeStatus === "liked" ? "👍 Unliked" : "👍 Liked",
  );
}

// Dislike track (toggle)
export async function dislikeTrack(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const stateBefore = await getPlayerInfo();
  await runAppleScript(`tell application "Kaset" to dislike track`);
  await showHUD(
    stateBefore?.likeStatus === "disliked" ? "👎 Undisliked" : "👎 Disliked",
  );
}

export async function searchSongs(query: string): Promise<SearchSong[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
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
    return extractSongsFromSearchResponse(json);
  } catch (error) {
    console.error("YouTube Music search failed:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Search temporarily unavailable",
      message: "YouTube Music search request failed. Please try again.",
    });
    return [];
  }
}

function extractSongsFromSearchResponse(
  response: Record<string, unknown>,
): SearchSong[] {
  const renderers = collectRenderers(
    response,
    "musicResponsiveListItemRenderer",
  );
  const songs = renderers
    .map(parseSongRenderer)
    .filter((song): song is SearchSong => song !== null);

  const uniqueById = new Map<string, SearchSong>();
  for (const song of songs) {
    if (!uniqueById.has(song.id)) {
      uniqueById.set(song.id, song);
    }
  }

  return [...uniqueById.values()];
}

function parseSongRenderer(
  renderer: Record<string, unknown>,
): SearchSong | null {
  const videoId = extractVideoIdFromRenderer(renderer);
  if (!videoId) return null;

  const title = extractFlexText(renderer, 0) ?? "Unknown Title";
  const subtitleText = extractFlexText(renderer, 1) ?? "";
  const subtitleParts = subtitleText
    .split(" • ")
    .map((part) => part.trim())
    .filter(Boolean);
  const artist = subtitleParts[0] ?? "Unknown Artist";
  const album = subtitleParts[1];
  const duration = extractFixedText(renderer, 0);
  const artworkURL = extractThumbnailURL(renderer);

  return {
    id: videoId,
    title,
    artist,
    album,
    duration,
    artworkURL,
  };
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Format seconds to MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
