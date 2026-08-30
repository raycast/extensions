import { launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import { spawn, spawnSync } from "child_process";
import { existsSync } from "fs";

const PLAYBACK_KEY = "playback";
const NOW_PLAYING_COMMAND = "now-playing";
const PLAYBACK_LOOKUP_ERROR = "Could not confirm the current playback process. Try stopping again.";

export type PlaybackState = {
  pid: number;
  trackId: string;
  audioPath: string;
  startedAt: number;
  processStartedAt: string;
};

type FieldLookup = { kind: "missing" } | { kind: "unknown" } | { kind: "found"; value: string };

type ProcessLookup =
  { kind: "missing" } | { kind: "unknown" } | { kind: "found"; command: string; processStartedAt: string };

type Ownership = "owned" | "foreign" | "unknown";

function readProcessField(pid: number, field: string): FieldLookup {
  const result = spawnSync("ps", ["-p", String(pid), "-ww", "-o", `${field}=`], {
    encoding: "utf8",
  });

  if (result.error) {
    return { kind: "unknown" };
  }

  if (result.status !== 0) {
    return { kind: "missing" };
  }

  const value = result.stdout.trim();
  if (!value) {
    return { kind: "missing" };
  }

  return { kind: "found", value };
}

function inspectProcess(pid: number): ProcessLookup {
  const started = readProcessField(pid, "lstart");
  if (started.kind !== "found") {
    return started;
  }

  const command = readProcessField(pid, "command");
  if (command.kind !== "found") {
    return command;
  }

  return {
    kind: "found",
    command: command.value,
    processStartedAt: started.value,
  };
}

function getProcessStartTime(pid: number): string | undefined {
  const started = readProcessField(pid, "lstart");
  return started.kind === "found" ? started.value : undefined;
}

function isAfplayCommand(command: string, audioPath: string): boolean {
  const executable = command.split(/\s+/, 1)[0];
  const isAfplay = executable === "afplay" || executable.endsWith("/afplay");
  if (!isAfplay) {
    return false;
  }

  return command.slice(executable.length).trim() === audioPath;
}

function getPlaybackOwnership(state: PlaybackState): Ownership {
  if (!state.processStartedAt) {
    return "foreign";
  }

  const process = inspectProcess(state.pid);
  if (process.kind === "unknown") {
    return "unknown";
  }

  if (process.kind === "missing") {
    return "foreign";
  }

  if (process.processStartedAt === state.processStartedAt && isAfplayCommand(process.command, state.audioPath)) {
    return "owned";
  }

  return "foreign";
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
    process.kill(pid, "SIGKILL");
  } catch {
    spawnSync("kill", ["-9", String(pid)]);
  }
}

function stopOwnedPlayback(state: PlaybackState): void {
  const confirmed = getPlaybackOwnership(state);
  switch (confirmed) {
    case "owned":
      killPlaybackProcess(state.pid);
      return;
    case "unknown":
      throw new Error(PLAYBACK_LOOKUP_ERROR);
    case "foreign":
      return;
    default: {
      const _exhaustive: never = confirmed;
      throw new Error(`Unhandled playback ownership: ${_exhaustive}`);
    }
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

  const ownership = getPlaybackOwnership(state);
  if (ownership === "unknown") {
    return state;
  }

  if (ownership === "foreign") {
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

  const ownership = getPlaybackOwnership(state);
  switch (ownership) {
    case "unknown":
      throw new Error(PLAYBACK_LOOKUP_ERROR);
    case "owned":
      stopOwnedPlayback(state);
      break;
    case "foreign":
      break;
    default: {
      const _exhaustive: never = ownership;
      throw new Error(`Unhandled playback ownership: ${_exhaustive}`);
    }
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

  if (!child.pid) {
    throw new Error("Failed to start playback.");
  }

  const processStartedAt = getProcessStartTime(child.pid);
  if (!processStartedAt) {
    try {
      child.kill("SIGKILL");
    } catch {
      killPlaybackProcess(child.pid);
    }
    throw new Error("Failed to start playback.");
  }

  child.unref();

  await LocalStorage.setItem(
    PLAYBACK_KEY,
    JSON.stringify({
      pid: child.pid,
      trackId,
      audioPath,
      startedAt: Date.now(),
      processStartedAt,
    } satisfies PlaybackState),
  );

  await refreshNowPlayingMenuBar();
}
