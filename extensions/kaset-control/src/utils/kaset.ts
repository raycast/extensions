import { runAppleScript } from "@raycast/utils";
import { LocalStorage, showHUD, showToast, Toast, open } from "@raycast/api";
import { mergeRecent, isPlaceholderTrack, type RecentTrack } from "./history";
import {
  buildAddToQueue,
  buildPlayTrackAtIndex,
  buildPlayVideos,
  buildRemoveFromQueue,
  isValidVideoId,
  parsePlayQueue,
  type PlayQueue,
} from "./queue";

// Re-export the pure queue helpers so callers can keep importing from ./kaset.
export * from "./queue";
export * from "./history";

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

// Search lives in ./search; re-exported here so existing imports keep working
// until play-song.tsx switches over (Task 5).
export {
  searchYouTubeMusic,
  searchYouTubeMusic as searchSongs,
  searchYouTube,
  mergeSearchResults,
} from "./search";
export type {
  SongResult,
  SongResult as SearchSong,
  VideoResult,
  SearchResult,
} from "./search";

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
  await showHUD("Playing");
}

// Pause
export async function pause(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  await runAppleScript(`tell application "Kaset" to pause`);
  await showHUD("Paused");
}

// Toggle play/pause
export async function playPause(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const state = await getPlayerInfo();
  await runAppleScript(`tell application "Kaset" to playpause`);
  await showHUD(state?.playerState === "playing" ? "Paused" : "Playing");
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
  await showHUD("Playing selected song");
}

// Play a regular YouTube video in Kaset (docs route these via `open -a Kaset`)
export async function playYouTubeVideo(videoId: string): Promise<void> {
  const normalizedId = videoId.trim();
  if (!isValidVideoId(normalizedId)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid video ID",
      message: "Please provide a valid YouTube video ID",
    });
    return;
  }

  if (!(await ensureKasetRunning())) return;
  await runAppleScript(
    `do shell script "open -a Kaset " & quoted form of "https://youtu.be/${normalizedId}"`,
  );
  await showHUD("Playing video");
}

// Next track
export async function nextTrack(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  await runAppleScript(`tell application "Kaset" to next track`);
  await showHUD("Next Track");
}

// Previous track
export async function previousTrack(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  await runAppleScript(`tell application "Kaset" to previous track`);
  await showHUD("Previous Track");
}

// Set volume (0-100)
export async function setVolume(volume: number): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)));
  await runAppleScript(
    `tell application "Kaset" to set volume ${clampedVolume}`,
  );
  await showHUD(`Volume: ${clampedVolume}%`);
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
  await showHUD(stateBefore?.shuffling ? "Shuffle Off" : "Shuffle On");
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
  await showHUD(`Repeat: ${nextMode}`);
}

// Toggle mute
export async function toggleMute(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const stateBefore = await getPlayerInfo();
  await runAppleScript(`tell application "Kaset" to toggle mute`);
  await showHUD(stateBefore?.muted ? "Unmuted" : "Muted");
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
  await showHUD(stateBefore?.likeStatus === "liked" ? "Unliked" : "Liked");
}

// Dislike track (toggle)
export async function dislikeTrack(): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  const stateBefore = await getPlayerInfo();
  await runAppleScript(`tell application "Kaset" to dislike track`);
  await showHUD(
    stateBefore?.likeStatus === "disliked" ? "Undisliked" : "Disliked",
  );
}

// --- Queue commands (Kaset >= 0.14.2) ---

// Get the current play queue
export async function getPlayQueue(): Promise<PlayQueue | null> {
  if (!(await isKasetRunning())) return null;

  try {
    const result = await runAppleScript(
      `tell application "Kaset" to get play queue`,
    );
    if (!result || result === "{}") return null;
    return parsePlayQueue(result);
  } catch (e) {
    console.error("Failed to get play queue:", e);
    return null;
  }
}

// Play a queue item by its 1-based index
export async function playTrackAtIndex(index: number): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  await runAppleScript(buildPlayTrackAtIndex(index));
  await showHUD("Playing queue item");
}

// Remove a video's entries from the queue (Kaset keeps the playing copy)
export async function removeFromQueue(id: string): Promise<void> {
  if (!(await ensureKasetRunning())) return;
  try {
    await runAppleScript(buildRemoveFromQueue(id));
  } catch (error) {
    // Kaset raises when there is nothing to remove, or when the only match is
    // the track that is playing. Surface its reason instead of a raw failure.
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not remove from queue",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  await showHUD("Removed from queue");
}

// Append video IDs to the queue, or insert them after the current track
export async function addToQueue(ids: string[], next = false): Promise<void> {
  if (!(await ensureKasetRunning())) return;

  const valid = ids.filter(isValidVideoId);
  if (valid.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid video ID",
    });
    return;
  }

  await runAppleScript(buildAddToQueue(valid, next));
  await showHUD(next ? "Playing next" : "Added to queue");
}

// Replace the queue with these video IDs and start playing
export async function playVideos(
  ids: string[],
  startingAt?: number,
): Promise<void> {
  if (!(await ensureKasetRunning())) return;

  const valid = ids.filter(isValidVideoId);
  if (valid.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid video ID",
    });
    return;
  }

  await runAppleScript(buildPlayVideos(valid, startingAt));
  await showHUD("Playing");
}

// Format seconds to MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// --- Recent-played log (forward-only, stored in LocalStorage) ---

const RECENT_KEY = "kaset-recently-played";

export async function recordPlayed(track: Track): Promise<void> {
  const raw = await LocalStorage.getItem<string>(RECENT_KEY);
  let prev: RecentTrack[] = [];
  if (raw) {
    try {
      prev = JSON.parse(raw) as RecentTrack[];
    } catch {
      prev = [];
    }
  }
  if (prev[0]?.id === track.id) return;
  await LocalStorage.setItem(
    RECENT_KEY,
    JSON.stringify(mergeRecent(prev, track, Date.now())),
  );
}

export async function getRecent(): Promise<RecentTrack[]> {
  const raw = await LocalStorage.getItem<string>(RECENT_KEY);
  if (!raw) return [];
  try {
    // Filter on read as well, so placeholders logged by earlier versions vanish
    // instead of lingering until they age out.
    return (JSON.parse(raw) as RecentTrack[]).filter(
      (entry) => !isPlaceholderTrack(entry),
    );
  } catch {
    return [];
  }
}

// Record a search result when the user plays it, so history does not depend on
// the background recorder or the menu bar.
const NOW_PLAYING_KEY = "kaset-now-playing";

// A song enters the history only once it has stopped playing: remember the
// current track and record the previous one when the track changes.
export async function recordFinishedTrack(
  current: Track | null,
): Promise<void> {
  // Kaset briefly reports an ID-only placeholder titled "Loading..." before the
  // real metadata lands; logging it would add a junk row to the history.
  if (current && isPlaceholderTrack(current)) return;

  const raw = await LocalStorage.getItem<string>(NOW_PLAYING_KEY);
  let previous: Track | null = null;
  if (raw) {
    try {
      previous = JSON.parse(raw) as Track;
    } catch {
      previous = null;
    }
  }

  if (current) {
    await LocalStorage.setItem(NOW_PLAYING_KEY, JSON.stringify(current));
  }

  if (previous && previous.id !== current?.id) {
    await recordPlayed(previous);
  }
}
