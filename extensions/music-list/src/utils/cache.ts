import path from "path";
import { CachedPayload, Song } from "../types";
import { Cache } from "@raycast/api";

const cache = new Cache();

export const getCacheKey = (folder: string, exts: string) =>
  `songs:${folder}:${exts.toLowerCase()}`;

export const readCache = (key: string): CachedPayload => {
  try {
    const raw = cache.get(key);
    if (!raw) return { songs: [], savedAt: 0 };
    const parsed = JSON.parse(raw) as CachedPayload | Song[];
    if (Array.isArray(parsed)) return { songs: parsed, savedAt: 0 };
    if (!parsed?.songs || !Array.isArray(parsed.songs)) return { songs: [], savedAt: 0 };
    return parsed;
  } catch {
    return { songs: [], savedAt: 0 };
  }
};

export const writeCache = (key: string, songs: Song[]) =>
  cache.set(key, JSON.stringify({ songs, savedAt: Date.now() }));

// Derive unique folder names from songs, relative to root.
export const getFolders = (songs: Song[], rootFolder: string): string[] => {
  const dirs = new Set<string>();

  for (const song of songs) {
    const songDir = path.dirname(song.path);
    const relative = path.relative(rootFolder, songDir);

    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      dirs.add(songDir); // Just add the song's directory directly
    }
  }

  return Array.from(dirs).sort();
};
