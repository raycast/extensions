import { environment } from "@raycast/api";
import { appendFile, readFile } from "fs/promises";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "path";
import { IMDB_APP_URL, TRAKT_APP_URL } from "./constants";
import { ImagesResponse } from "./schema";

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

export const getPosterUrl = (images: ImagesResponse | undefined, fallback: "poster.png") => {
  if (images && images.poster && images.poster.length > 0) {
    return `https://${images.poster[0]}`;
  }

  return fallback;
};

/**
 * Wide artwork for a 16/9 card: the title's fanart, then the episode still, then the poster.
 * `episode.png` is the landscape placeholder when Trakt sends none of them.
 */
export const getBackdropUrl = (images: ImagesResponse | undefined, episodeImages?: ImagesResponse) => {
  const url = images?.fanart?.[0] ?? episodeImages?.screenshot?.[0] ?? images?.poster?.[0];
  return url ? `https://${url}` : "episode.png";
};

export const getScreenshotUrl = (images: ImagesResponse | undefined, fallback: "episode.png") => {
  if (images && images.screenshot && images.screenshot.length > 0) {
    return `https://${images.screenshot[0]}`;
  }

  return fallback;
};

export const getBannerUrl = (images: ImagesResponse | undefined, fallback: "episode.png") => {
  if (images && images.thumb && images.thumb.length > 0) {
    return `https://${images.thumb[0]}`;
  }

  return fallback;
};

export const getTraktUrl = (
  type: "movies" | "shows" | "season" | "episode",
  slug: string | undefined,
  seasonNumber: number = 0,
  episodeNumber: number = 0,
) => {
  // Guard against missing slug values returned by the API. We fall back to a generic listing URL.
  if (!slug) {
    return `${TRAKT_APP_URL}`;
  }

  switch (type) {
    case "movies":
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
    return `${IMDB_APP_URL}/title/${imdbId}/episodes?season=${seasonNumber}`;
  }
  return `${IMDB_APP_URL}/title/${imdbId}`;
};

const watchedAtFormatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

/**
 * Trakt stores a watch marked "unknown date" as the Unix epoch (Trakt Web shows "January 1st, 1970").
 * Say so instead of printing a date that never happened.
 */
export const formatWatchedAt = (watchedAt: string | undefined) => {
  if (!watchedAt) return "";

  const date = new Date(watchedAt);
  if (Number.isNaN(date.getTime())) return "";

  return date.getTime() <= 0 ? "Unknown date" : watchedAtFormatter.format(date);
};
