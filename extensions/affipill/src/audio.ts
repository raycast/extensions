import { launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import { spawn, spawnSync } from "child_process";
import { existsSync } from "fs";

const PLAYBACK_KEY = "playback";
const NOW_PLAYING_COMMAND = "now-playing";

export type PlaybackState = {
  pid: number;
  trackId: string;
  audioPath: string;
  startedAt: number;
};

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function clearPlaybackState(): Promise<void> {
  await LocalStorage.removeItem(PLAYBACK_KEY);
}

async function readPlaybackState(): Promise<PlaybackState | null> {
  const item = await LocalStorage.getItem<string>(PLAYBACK_KEY);
  if (!item) {
    return null;
  }

  try {
    return JSON.parse(item) as PlaybackState;
  } catch {
    await clearPlaybackState();
    return null;
  }
}

function killPlaybackProcess(pid: number, audioPath?: string): void {
  try {
    process.kill(-pid, "SIGKILL");
    return;
  } catch {
    // Try the next kill strategy.
  }

  try {
    process.kill(pid, "SIGKILL");
    return;
  } catch {
    // Try the next kill strategy.
  }

  const killResult = spawnSync("kill", ["-9", String(pid)]);
  if (killResult.status === 0) {
    return;
  }

  const pkillResult = spawnSync("pkill", ["-P", String(pid)]);
  if (pkillResult.status === 0) {
    return;
  }

  if (audioPath) {
    spawnSync("pkill", ["-f", audioPath]);
  }
}

export async function refreshNowPlayingMenuBar(): Promise<void> {
  try {
    await launchCommand({
      name: NOW_PLAYING_COMMAND,
      type: LaunchType.Background,
    });
  } catch {
    // The menu bar command may not be enabled yet.
  }
}

export async function getPlaybackState(): Promise<PlaybackState | null> {
  const state = await readPlaybackState();
  if (!state) {
    return null;
  }

  if (!isProcessRunning(state.pid)) {
    await clearPlaybackState();
    await refreshNowPlayingMenuBar();
    return null;
  }

  return state;
}

export async function stopPlayback(): Promise<void> {
  const state = await readPlaybackState();
  if (!state) {
    return;
  }

  killPlaybackProcess(state.pid, state.audioPath);
  await clearPlaybackState();
  await refreshNowPlayingMenuBar();
}

export async function playTrack(trackId: string, audioPath: string): Promise<void> {
  if (!existsSync(audioPath)) {
    throw new Error("This track's audio file is missing.");
  }

  await stopPlayback();

  const child = spawn("afplay", [audioPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  if (!child.pid) {
    throw new Error("Failed to start playback.");
  }

  await LocalStorage.setItem(
    PLAYBACK_KEY,
    JSON.stringify({
      pid: child.pid,
      trackId,
      audioPath,
      startedAt: Date.now(),
    } satisfies PlaybackState),
  );

  await refreshNowPlayingMenuBar();
}
