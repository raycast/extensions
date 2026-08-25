import fs from "fs";
import { parseFile } from "music-metadata";
import os from "os";
import path from "path";
import { Song } from "../types";
import { closeMainWindow, PopToRootType } from "@raycast/api";

export const parseExtensions = (raw: string): Set<string> =>
  new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .map((e) => (e.startsWith(".") ? e : `.${e}`))
  );

export const getMusicFolder = (configured?: string): string =>
  configured || path.join(os.homedir(), "Music");
const walkDirectory = async (dir: string): Promise<string[]> => {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...(await walkDirectory(full)));
      else if (entry.isFile()) results.push(full);
    }
    return results;
  } catch {
    return [];
  }
};

const readSongMetadata = async (filePath: string): Promise<Song> => {
  const fallbackTitle = path.basename(filePath, path.extname(filePath));
  try {
    const { common, format } = await parseFile(filePath, { skipCovers: true });
    return {
      title: common.title || fallbackTitle,
      author: common.artist || common.albumartist || "Unknown",
      album: common.album || "Unknown",
      path: filePath,
      duration: format.duration || 0,
      format:
        format.container ||
        format.codec ||
        path.extname(filePath).slice(1).toUpperCase() ||
        "Unknown",
    };
  } catch {
    return {
      title: fallbackTitle,
      author: "Unknown",
      album: "Unknown",
      path: filePath,
      duration: 0,
      format: "Unknown",
    };
  }
};

export const loadAllSongs = async (musicFolder: string, exts: Set<string>): Promise<Song[]> => {
  const files = await walkDirectory(musicFolder);
  const audio = files.filter((f) => exts.has(path.extname(f).toLowerCase()));

  const results: Song[] = [];
  const chunkSize = 25;

  for (let i = 0; i < audio.length; i += chunkSize) {
    const chunk = audio.slice(i, i + chunkSize);
    const resolved = await Promise.all(chunk.map(readSongMetadata));
    results.push(...resolved);
  }

  return results;
};

export const goToRoot = async () => {
  await closeMainWindow({
    popToRootType: PopToRootType.Immediate,
    clearRootSearch: true,
  });
};

export const shuffleArray = (arr: Song[]) => {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const formatDuration = (seconds: number) =>
  Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
