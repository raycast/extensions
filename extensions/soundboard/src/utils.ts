import { spawn } from "node:child_process";
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
  return readRegisteredPids(audioPath).some((pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  });
};

export const getLivePlayingPaths = async (): Promise<string[]> => {
  const live: string[] = [];
  for (const audioPath of getPlayingPaths()) {
    if (await isPlayerAlive(audioPath)) {
      live.push(audioPath);
    } else {
      setPlaying(audioPath, false);
    }
  }
  return live;
};

const readRegisteredPids = (audioPath: string): number[] => {
  try {
    return readFileSync(registryFile(audioPath), "utf8")
      .split("\n")
      .filter((line) => line !== "")
      .map((line) => Number(line))
      .filter((pid) => !Number.isNaN(pid));
  } catch {
    return [];
  }
};

const registerPlayer = (audioPath: string, pid: number) => {
  try {
    mkdirSync(registryDir(), { recursive: true });
    appendFileSync(registryFile(audioPath), `${pid}\n`);
  } catch {
    // Best effort only, playback still works.
  }
};

const unregisterPlayer = (audioPath: string, pid: number) => {
  try {
    const file = registryFile(audioPath);
    const pids = readRegisteredPids(audioPath).filter((existing) => existing !== pid);
    if (pids.length === 0) {
      rmSync(file, { force: true });
    } else {
      writeFileSync(file, `${pids.join("\n")}\n`);
    }
  } catch {
    // Best effort only.
  }
};

const stopMacOSPlayers = (audioPath: string) => {
  try {
    const pids = readRegisteredPids(audioPath);
    for (const pid of pids) {
      try {
        process.kill(pid);
      } catch {
        // The process already exited.
      }
    }
    rmSync(registryFile(audioPath), { force: true });
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
      .then(() => setPlaying(audioPath, false))
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
      setPlaying(audioPath, false);
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
