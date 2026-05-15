import fs from "fs";
import crypto from "crypto";
import path from "path";
import { environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export const API_TRIPLE_URL =
  "https://basalt-prod.up.railway.app/api/wallpapers/raycast-triple";
export const API_RANDOM_URL =
  "https://basalt-prod.up.railway.app/api/wallpapers/random-human";

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

function getCachedWallpaperPath(url: string, id?: string) {
  const extension = path.extname(new URL(url).pathname) || ".jpg";
  const cacheKey = id || crypto.createHash("sha1").update(url).digest("hex");
  return path.join(environment.supportPath, `${cacheKey}${extension}`);
}

function pruneWallpaperCache(keepFilePath: string) {
  const maxFiles = 20;
  const files = fs
    .readdirSync(environment.supportPath)
    .map((file) => {
      const filePath = path.join(environment.supportPath, file);
      const stat = fs.statSync(filePath);
      return { filePath, stat };
    })
    .filter(({ filePath, stat }) => filePath !== keepFilePath && stat.isFile())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
    .map(({ filePath }) => filePath);

  for (const filePath of files.slice(maxFiles - 1)) {
    fs.unlinkSync(filePath);
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

export async function setDesktopWallpaper(url: string, id?: string) {
  const tempDir = environment.supportPath;
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filePath = getCachedWallpaperPath(url, id);

  if (!fs.existsSync(filePath)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to download image");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
  }

  fs.utimesSync(filePath, new Date(), new Date());
  pruneWallpaperCache(filePath);

  const script = `tell application "System Events" to tell every desktop to set picture to "${filePath}"`;
  await runAppleScript(script);
}

export async function downloadWallpaper(
  url: string,
  name: string,
  id?: string,
) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to download image");

  const arrayBuffer = await response.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const downloadsDir = path.join(process.env.HOME || "", "Downloads");

  // Determine extension from URL or content-type
  let extension = path.extname(new URL(url).pathname);
  if (!extension) {
    const contentType = response.headers.get("content-type");
    if (contentType === "image/jpeg") extension = ".jpg";
    else if (contentType === "image/png") extension = ".png";
    else if (contentType === "image/webp") extension = ".webp";
    else extension = ".jpg"; // Fallback
  }

  // Sanitize filename
  const safeName = name.replace(/[^a-z0-9]/gi, "_");
  const fileName = id ? `${safeName}_${id}` : safeName;
  const filePath = getAvailableDownloadPath(
    path.join(downloadsDir, `${fileName}${extension}`),
  );

  fs.writeFileSync(filePath, buffer);
  return filePath;
}
