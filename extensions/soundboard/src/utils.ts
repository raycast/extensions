import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Item } from "./types";
import { getItem, getItems, saveItems } from "./storage";
import { environment, launchCommand, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  is_playing as isPlayingWindows,
  play_file as playFileWindows,
  stop_file as stopFileWindows,
} from "rust:../rust";

export const isMacOS = process.platform === "darwin";

const registryDir = () => join(tmpdir(), "raycast-soundboard");

// Each macOS player is recorded in its own file so that registration and
// cleanup are atomic per player: `registerPlayer` creates one file and
// `unregisterPlayer` removes that same file. Because no two players share a
// file, concurrent operations never produce a lost update that could erase
// another live player's record.
const playersDir = (audioPath: string) =>
  join(registryDir(), "players", createHash("sha256").update(audioPath).digest("hex").slice(0, 16));

const playerFile = (audioPath: string, pid: number) => join(playersDir(audioPath), String(pid));

const playingRegistryFile = () => join(registryDir(), "playing.json");

export const getPlayingPaths = (): string[] => {
  try {
    const parsed = JSON.parse(readFileSync(playingRegistryFile(), "utf8"));
    return Array.isArray(parsed) ? parsed.filter((path) => typeof path === "string") : [];
  } catch {
    return [];
  }
};

const setPlaying = (audioPath: string, playing: boolean) => {
  try {
    mkdirSync(registryDir(), { recursive: true });
    const paths = getPlayingPaths().filter((path) => path !== audioPath);
    if (playing) {
      paths.push(audioPath);
    }
    if (paths.length === 0) {
      rmSync(playingRegistryFile(), { force: true });
    } else {
      writeFileSync(playingRegistryFile(), JSON.stringify(paths));
    }
  } catch {
    // Best effort only.
  }
};

const isPlayerAlive = async (audioPath: string): Promise<boolean> => {
  if (process.platform === "win32") {
    try {
      return await isPlayingWindows(audioPath);
    } catch {
      return false;
    }
  }
  return readRegisteredPlayers(audioPath).some((record) => isPlayerRunning(record, audioPath));
};

export const getLivePlayingPaths = async (): Promise<string[]> => {
  const live: string[] = [];
  for (const audioPath of getPlayingPaths()) {
    if (process.platform !== "win32") {
      pruneRegisteredPlayers(audioPath);
    }
    if (await isPlayerAlive(audioPath)) {
      live.push(audioPath);
    } else {
      setPlaying(audioPath, false);
    }
  }
  return live;
};

interface PlayerRecord {
  pid: number;
  startTime: string;
}

const getProcessStartTime = (pid: number): string | null => {
  try {
    const output = execFileSync("ps", ["-p", String(pid), "-o", "lstart="], { encoding: "utf8" }).trim();
    return output || null;
  } catch {
    return null;
  }
};

const getProcessCommand = (pid: number): string | null => {
  try {
    // `-ww` disables ps's default output-width truncation so long audio paths
    // are returned in full; otherwise a truncated command would fail the exact
    // identity match below and hide a live player.
    const output = execFileSync("ps", ["-ww", "-p", String(pid), "-o", "command="], { encoding: "utf8" }).trim();
    return output || null;
  } catch {
    return null;
  }
};

// macOS exposes no stable process identity to Node, so before ever signaling a
// registered player we require ALL of the following to hold:
//   1. The PID still exists.
//   2. The process start time still matches the one captured at spawn.
//   3. The process command line is exactly the `afplay` invocation we spawned
//      for this audio file: the executable basename is `afplay` and the
//      re-joined arguments equal the audio path (not merely contain it).
// This makes killing an unrelated process after PID reuse practically
// unreachable: a reused PID would additionally have to collide on the
// second-granularity start time (macOS PIDs are allocated monotonically and
// only wrap after ~2M forks) AND have a command line that exactly matches the
// captured `afplay <path>` invocation. Registration is best-effort - if any
// `ps` probe fails the player is treated as not running and playback continues
// without Stop.
const isPlayerRunning = (record: PlayerRecord, audioPath: string): boolean => {
  if (getProcessStartTime(record.pid) !== record.startTime) {
    return false;
  }
  const command = getProcessCommand(record.pid);
  if (command === null) {
    return false;
  }
  // `ps -o command=` joins argv with single spaces, so joining the tokens back
  // with a single space reconstructs the original argument (paths with spaces
  // included), while an exact comparison rejects any process whose command
  // merely contains the registered path as a substring.
  const tokens = command.split(" ");
  const executable = tokens[0]?.split("/").pop() ?? "";
  return executable === "afplay" && tokens.slice(1).join(" ") === audioPath;
};

const readRegisteredPlayers = (audioPath: string): PlayerRecord[] => {
  try {
    const dir = playersDir(audioPath);
    if (!existsSync(dir)) {
      return [];
    }
    return readdirSync(dir)
      .map((name) => {
        const pid = Number(name);
        if (Number.isNaN(pid)) {
          return null;
        }
        let startTime = "";
        try {
          startTime = readFileSync(join(dir, name), "utf8").trim();
        } catch {
          return null;
        }
        return startTime === "" ? null : { pid, startTime };
      })
      .filter((record): record is PlayerRecord => record !== null);
  } catch {
    return [];
  }
};

const registerPlayer = (audioPath: string, pid: number) => {
  try {
    const startTime = getProcessStartTime(pid);
    if (startTime === null) {
      return;
    }
    mkdirSync(playersDir(audioPath), { recursive: true });
    writeFileSync(playerFile(audioPath, pid), startTime, { flag: "w" });
  } catch {
    // Best effort only, playback still works.
  }
};

const unregisterPlayer = (audioPath: string, pid: number) => {
  try {
    rmSync(playerFile(audioPath, pid), { force: true });
  } catch {
    // Best effort only.
  }
};

const pruneRegisteredPlayers = (audioPath: string) => {
  for (const record of readRegisteredPlayers(audioPath)) {
    if (!isPlayerRunning(record, audioPath)) {
      unregisterPlayer(audioPath, record.pid);
    }
  }
};

const stopMacOSPlayers = (audioPath: string) => {
  const players = readRegisteredPlayers(audioPath).filter((record) => isPlayerRunning(record, audioPath));
  for (const { pid } of players) {
    try {
      process.kill(pid);
    } catch {
      // The process already exited.
    }
    // Unregister only the players we just stopped. A same-path playback that is
    // registered concurrently keeps its own file, so it retains liveness
    // tracking and a working Stop action.
    unregisterPlayer(audioPath, pid);
  }
  // Best-effort removal of the per-sound directory only once it is empty. It is
  // non-recursive on purpose: if a player registered during this stop the
  // removal fails and that new registration is preserved.
  try {
    rmSync(playersDir(audioPath), { force: true });
  } catch {
    // Best effort only.
  }
};

export const playSoundFromIndex = async (index: number) => {
  const sound = await getItem(index);
  if (sound) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await playFile(sound);
    }

    await updateCommandMetadata({ subtitle: `${sound.title} · Soundboard` });
    return;
  }

  if (environment.launchType === LaunchType.UserInitiated) {
    launchCommand({ name: "index", type: LaunchType.UserInitiated, context: { index: index } });
  }

  await updateCommandMetadata({ subtitle: "Soundboard" });
};

export const playFile = async (item: Item) => {
  const audioPath = item.path[0];
  if (process.platform === "win32") {
    setPlaying(audioPath, true);
    playFileWindows(audioPath)
      .then(async () => {
        if (!(await isPlayerAlive(audioPath))) {
          setPlaying(audioPath, false);
        }
      })
      .catch((error) => {
        setPlaying(audioPath, false);
        showToast({ style: Toast.Style.Failure, title: "Failed to play sound", message: String(error) });
      });
  } else {
    const child = spawn("afplay", [audioPath]);
    const pid = child.pid;
    if (pid !== undefined) {
      registerPlayer(audioPath, pid);
    }
    setPlaying(audioPath, true);
    let notified = false;
    const notifyFailure = (message: string) => {
      if (!notified) {
        notified = true;
        showToast({ style: Toast.Style.Failure, title: "Failed to play sound", message });
      }
    };
    const unregister = () => {
      if (pid !== undefined) {
        unregisterPlayer(audioPath, pid);
      }
      if (readRegisteredPlayers(audioPath).length === 0) {
        setPlaying(audioPath, false);
      }
    };
    // Spawn failure (e.g. afplay missing).
    child.on("error", (error) => {
      unregister();
      notifyFailure(error.message);
    });
    // Non-zero exit means afplay could not play the file (e.g. missing or
    // unreadable). A signal-killed process (code is null, e.g. our own Stop)
    // is expected and not reported as a failure.
    child.on("exit", (code, signal) => {
      unregister();
      if (code !== null && code !== 0) {
        notifyFailure(signal ? `afplay was terminated by ${signal}` : `afplay exited with code ${code}`);
      }
    });
  }
};

export const stopFile = async (item: Item) => {
  const audioPath = item.path[0];
  setPlaying(audioPath, false);
  if (process.platform === "win32") {
    stopFileWindows(audioPath).catch((error) => {
      showToast({ style: Toast.Style.Failure, title: "Failed to stop sound", message: String(error) });
    });
  } else {
    stopMacOSPlayers(audioPath);
  }
};

export const updateFavoriteSubtitles = async (item: Item) => {
  if (item.favourite !== "0") {
    await launchCommand({ name: `favorite${item.favourite}`, type: LaunchType.Background });
  }

  if (item.last_favourite && item.last_favourite !== "0") {
    await launchCommand({ name: `favorite${item.last_favourite}`, type: LaunchType.Background });
  }
};

export const addItem = async (item: Item) => {
  let items: Item[] = await getItems();

  // Figure out if items favourite already exists in items
  const alreadyAssignedItem = items.find((i) => i.favourite === item.favourite && i.id !== item.id);
  if (alreadyAssignedItem) {
    items = items.map((i) => {
      if (i.favourite === item.favourite) {
        i.favourite = "0";
      }
      return i;
    });
  }

  // Figure out if item.id already exists in items and is so, replace it else add it
  const alreadyExists = items.find((i) => i.id === item.id);
  if (alreadyExists) {
    items = items.map((i) => {
      return i.id === item.id ? item : i;
    });
  } else {
    items.push(item);
  }

  await saveItems(items);
  await updateFavoriteSubtitles(item);

  return items;
};

export const removeItemEntry = async (item: Item) => {
  let items: Item[] = await getItems();
  items = items.filter((i) => i.id !== item.id);

  await saveItems(items);
  await updateFavoriteSubtitles(item);

  return items;
};
