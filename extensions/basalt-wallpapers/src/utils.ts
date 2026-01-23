import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { environment } from "@raycast/api";

const execPromise = promisify(exec);

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

export async function setDesktopWallpaper(url: string) {
  const tempDir = environment.supportPath;
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filename = path.basename(new URL(url).pathname);
  const filePath = path.join(tempDir, filename);

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to download image");

  const arrayBuffer = await response.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  fs.writeFileSync(filePath, buffer);

  // AppleScript to set wallpaper on all desktops
  const script = `tell application "System Events" to tell every desktop to set picture to "${filePath}"`;
  await execPromise(`osascript -e '${script}'`);
}

export async function downloadWallpaper(url: string, name: string) {
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
  const filePath = path.join(downloadsDir, `${safeName}${extension}`);

  fs.writeFileSync(filePath, buffer);
  return filePath;
}
