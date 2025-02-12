import { environment } from "@raycast/api";
import { appendFile, readFile } from "fs/promises";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "path";
import { IMDB_APP_URL, TMDB_IMG_URL, TRAKT_APP_URL } from "./constants";

export const setFileCache = async (key: string, content: string) => {
  const filePath = path.join(`${environment.supportPath}`, `${key}.txt`);
  if (content && !content.endsWith("\n")) {
    content += "\n";
  }
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
  await appendFile(filePath, content);
};

export const getFileCache = async (key: string) => {
  const filePath = path.join(`${environment.supportPath}`, `${key}.txt`);
  if (!existsSync(filePath)) {
    return undefined;
  }
  return await readFile(filePath, "utf-8");
};

export const getPosterUrl = (posterPath: string | undefined, fallback: "poster.png" | "episode.png") => {
  if (posterPath) {
    return `${TMDB_IMG_URL}${posterPath}`;
  }

  return fallback;
};

export const getTraktUrl = (
  type: "movie" | "shows" | "season" | "episode",
  slug: string,
  seasonNumber: number = 0,
  episodeNumber: number = 0,
) => {
  switch (type) {
    case "movie":
    case "shows":
      return `${TRAKT_APP_URL}/${type}/${slug}`;
    case "season":
      return `${TRAKT_APP_URL}/shows/${slug}/seasons/${seasonNumber}`;
    case "episode":
      return `${TRAKT_APP_URL}/shows/${slug}/seasons/${seasonNumber}/episodes/${episodeNumber}`;
  }
};

export const getIMDbUrl = (imdbId: string, seasonNumber?: number): string => {
  if (seasonNumber) {
    return `${IMDB_APP_URL}/${imdbId}/episodes?season=${seasonNumber}`;
  }
  return `${IMDB_APP_URL}/${imdbId}`;
};
