import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const registryDir = () => join(tmpdir(), "raycast-soundboard");

const registryFile = (audioPath: string) =>
  join(registryDir(), `${createHash("sha256").update(audioPath).digest("hex").slice(0, 16)}.pids`);

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
    const output = execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).trim();
    return output || null;
  } catch {
    return null;
  }
};

// macOS exposes no stable process identity to Node, so before ever signaling a
// registered player we require ALL of the following to hold:
//   1. The PID still exists.
//   2. The process start time still matches the one captured at spawn.
//   3. The process is still the `afplay` invocation for this exact audio file.
// This makes killing an unrelated process after PID reuse practically
// unreachable: a reused PID would additionally have to collide on the
// second-granularity start time (macOS PIDs are allocated monotonically and
// only wrap after ~2M forks) AND have a command line naming `afplay` with the
// same audio path. Registration is best-effort - if any `ps` probe fails the
// player is treated as not running and playback continues without Stop.
const isPlayerRunning = (record: PlayerRecord, audioPath: string): boolean => {
  if (getProcessStartTime(record.pid) !== record.startTime) {
    return false;
  }
  const command = getProcessCommand(record.pid);
  return command !== null && command.includes("afplay") && command.includes(audioPath);
};

const readRegisteredPlayers = (audioPath: string): PlayerRecord[] => {
  try {
    return readFileSync(registryFile(audioPath), "utf8")
      .split("\n")
      .filter((line) => line !== "")
      .map((line) => {
        const separator = line.indexOf(":");
        if (separator <= 0) {
          return null;
        }
        const pid = Number(line.slice(0, separator));
        const startTime = line.slice(separator + 1);
        return Number.isNaN(pid) || startTime === "" ? null : { pid, startTime };
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
    mkdirSync(registryDir(), { recursive: true });
    appendFileSync(registryFile(audioPath), `${pid}:${startTime}\n`);
  } catch {
    // Best effort only, playback still works.
  }
};

const unregisterPlayer = (audioPath: string, pid: number) => {
  try {
    const file = registryFile(audioPath);
    const remaining = readRegisteredPlayers(audioPath).filter((record) => record.pid !== pid);
    if (remaining.length === 0) {
      rmSync(file, { force: true });
    } else {
      writeFileSync(file, `${remaining.map((record) => `${record.pid}:${record.startTime}`).join("\n")}\n`);
    }
  } catch {
    // Best effort only.
  }
};

const pruneRegisteredPlayers = (audioPath: string) => {
  try {
    const file = registryFile(audioPath);
    const remaining = readRegisteredPlayers(audioPath).filter((record) => isPlayerRunning(record, audioPath));
    if (remaining.length === 0) {
      rmSync(file, { force: true });
    } else {
      writeFileSync(file, `${remaining.map((record) => `${record.pid}:${record.startTime}`).join("\n")}\n`);
    }
  } catch {
    // Best effort only.
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
  }
  rmSync(registryFile(audioPath), { force: true });
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
    const unregister = () => {
      if (pid !== undefined) {
        unregisterPlayer(audioPath, pid);
      }
      if (readRegisteredPlayers(audioPath).length === 0) {
        setPlaying(audioPath, false);
      }
    };
    child.on("exit", unregister);
    child.on("error", unregister);
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
