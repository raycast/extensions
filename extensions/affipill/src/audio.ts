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

function getProcessCommandLine(pid: number): string | undefined {
  const result = spawnSync("ps", ["-p", String(pid), "-ww", "-o", "command="], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return undefined;
  }

  const command = result.stdout.trim();
  return command || undefined;
}

function isOwnedPlaybackProcess(pid: number, audioPath: string): boolean {
  const command = getProcessCommandLine(pid);
  if (!command) {
    return false;
  }

  const executable = command.split(/\s+/, 1)[0];
  const isAfplay = executable === "afplay" || executable.endsWith("/afplay");
  if (!isAfplay) {
    return false;
  }

  return command.slice(executable.length).trim() === audioPath;
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

function killPlaybackProcess(pid: number): void {
  try {
    process.kill(-pid, "SIGKILL");
    return;
  } catch {
    // Try the next kill strategy.
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    spawnSync("kill", ["-9", String(pid)]);
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

  if (!isOwnedPlaybackProcess(state.pid, state.audioPath)) {
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

  if (isOwnedPlaybackProcess(state.pid, state.audioPath)) {
    killPlaybackProcess(state.pid);
  }
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
