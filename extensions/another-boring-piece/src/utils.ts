import fs from "fs";
import crypto from "crypto";
import path from "path";
import { environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import {
  recordWallpaperHistoryBestEffort,
  type WallpaperHistoryEventType,
} from "./history-store";

export const API_TRIPLE_URL =
  "https://service.anotherboring.day/api/wallpapers/raycast-triple";
export const API_RANDOM_URL =
  "https://service.anotherboring.day/api/wallpapers/random-human";

export interface Wallpaper {
  id: string;
  name: string;
  url: string;
  description: string;
  artist: string;
  creationDate: string;
  websiteUrl?: string;
}

export function getThumbnailUrl(
  url: string,
  options: { width?: number; height?: number },
): string {
  const params = [];
  if (options.width) params.push(`w_${options.width}`);
  if (options.height) params.push(`h_${options.height}`);

  // Check if it's a Cloudinary URL
  if (url.includes("cloudinary.com")) {
    const transformation = `${params.join(",")},c_limit,q_auto,f_auto`;
    return url.replace("/upload/", `/upload/${transformation}/`);
  }

  // Check if it's a Cloudflare Image URL
  if (url.includes("imagedelivery.net")) {
    const cfParams = [];
    if (options.width) cfParams.push(`w=${options.width}`);
    if (options.height) cfParams.push(`h=${options.height}`);
    cfParams.push("fit=contain");
    return url.replace(/\/([^/]+)$/, `/${cfParams.join(",")}`);
  }

  return url;
}

export function buildWallpaperMarkdown(wallpaper: Wallpaper, footer = "") {
  const imageUrl = getThumbnailUrl(wallpaper.url, { height: 280 });
  return `
<img src="${imageUrl}" alt="${wallpaper.name}" height="280" />

**${wallpaper.name}**

${wallpaper.artist}, ${wallpaper.creationDate}

${wallpaper.description || ""}${footer}
`;
}

function sanitizeCacheKey(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getWallpaperCacheKey(url: string, id?: string) {
  const rawKey = id || crypto.createHash("sha1").update(url).digest("hex");
  return sanitizeCacheKey(rawKey);
}

function getCachedWallpaperPath(url: string, extension: string, id?: string) {
  const cacheKey = getWallpaperCacheKey(url, id);
  return path.join(
    environment.supportPath,
    "history",
    "wallpapers",
    `${cacheKey}${extension}`,
  );
}

function getCachedWallpaperDirectory() {
  return path.join(environment.supportPath, "history", "wallpapers");
}

function pruneWallpaperCache(keepFilePath: string) {
  const maxFiles = 20;
  const dir = getCachedWallpaperDirectory();
  if (!fs.existsSync(dir)) return;

  type CacheFile = { filePath: string; stat: fs.Stats };
  const files = fs
    .readdirSync(dir)
    .map((file): CacheFile | undefined => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      return stat.isFile() ? { filePath, stat } : undefined;
    })
    .filter(
      (file): file is CacheFile => !!file && file.filePath !== keepFilePath,
    )
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
    .map(({ filePath }) => filePath);

  for (const filePath of files.slice(maxFiles - 1)) {
    fs.unlinkSync(filePath);
  }
}

function getExistingCachedWallpaperPath(url: string, id?: string) {
  const cacheKey = getWallpaperCacheKey(url, id);
  const dir = getCachedWallpaperDirectory();
  if (!fs.existsSync(dir)) return undefined;
  const fileName = fs
    .readdirSync(dir)
    .find((fileName) => path.parse(fileName).name === cacheKey);
  return fileName ? path.join(dir, fileName) : undefined;
}

function getExtensionFromContentType(contentType: string | null) {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase();
  switch (normalized) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}

function getAvailableDownloadPath(filePath: string) {
  if (!fs.existsSync(filePath)) return filePath;

  const parsedPath = path.parse(filePath);
  let index = 2;
  let nextPath = path.join(
    parsedPath.dir,
    `${parsedPath.name}-${index}${parsedPath.ext}`,
  );

  while (fs.existsSync(nextPath)) {
    index += 1;
    nextPath = path.join(
      parsedPath.dir,
      `${parsedPath.name}-${index}${parsedPath.ext}`,
    );
  }

  return nextPath;
}

export async function ensureWallpaperFile(url: string, id?: string) {
  const urlExtension = path.extname(new URL(url).pathname);
  const existingFilePath = urlExtension
    ? getCachedWallpaperPath(url, urlExtension, id)
    : getExistingCachedWallpaperPath(url, id);
  if (existingFilePath && fs.existsSync(existingFilePath)) {
    fs.utimesSync(existingFilePath, new Date(), new Date());
    return existingFilePath;
  }

  const dir = getCachedWallpaperDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to download image");

  const extension =
    urlExtension ||
    getExtensionFromContentType(response.headers.get("content-type"));
  const filePath = getCachedWallpaperPath(url, extension, id);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  fs.writeFileSync(filePath, buffer);

  fs.utimesSync(filePath, new Date(), new Date());
  pruneWallpaperCache(filePath);
  return filePath;
}

export async function setDesktopWallpaper(
  wallpaper: Wallpaper,
  eventType: WallpaperHistoryEventType = "selected",
) {
  const filePath = await ensureWallpaperFile(wallpaper.url, wallpaper.id);
  const escapedPath = filePath.replace(/[\\"]/g, "\\$&");
  const script = `tell application "System Events" to tell every desktop to set picture to "${escapedPath}"`;
  await runAppleScript(script);
  recordWallpaperHistoryBestEffort({
    eventType,
    wallpaper,
  });
  return filePath;
}

export async function downloadWallpaper(wallpaper: Wallpaper) {
  const sourcePath = await ensureWallpaperFile(wallpaper.url, wallpaper.id);
  const downloadsDir = path.join(process.env.HOME || "", "Downloads");
  const extension = path.extname(sourcePath) || ".jpg";

  const safeName = wallpaper.name.replace(/[^a-z0-9]/gi, "_");
  const fileName = `${safeName}_${sanitizeCacheKey(wallpaper.id)}`;
  const filePath = getAvailableDownloadPath(
    path.join(downloadsDir, `${fileName}${extension}`),
  );

  fs.copyFileSync(sourcePath, filePath);
  recordWallpaperHistoryBestEffort({
    eventType: "downloaded",
    wallpaper,
    downloadPath: filePath,
  });
  return filePath;
}
