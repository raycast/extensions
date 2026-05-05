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

// Format seconds to MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
