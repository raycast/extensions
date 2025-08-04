import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const STATE_FILE = join(tmpdir(), "looma-fm-state.json");

export interface PlaybackState {
  currentTrack?: {
    name: string;
    url: string;
    path: string;
  };
  isPlaying: boolean;
  isPaused: boolean;
  tempFilePath?: string;
  pid?: number;
}

export function savePlaybackState(state: PlaybackState): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("Failed to save playback state:", error);
  }
}

export function loadPlaybackState(): PlaybackState | null {
  try {
    if (existsSync(STATE_FILE)) {
      const data = readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load playback state:", error);
  }
  return null;
}

export function clearPlaybackState(): void {
  try {
    if (existsSync(STATE_FILE)) {
      unlinkSync(STATE_FILE);
    }
  } catch (error) {
    console.error("Failed to clear playback state:", error);
  }
}
