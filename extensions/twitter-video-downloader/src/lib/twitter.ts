import axios from "axios";
import { createWriteStream, existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { parse, resolve } from "node:path";
import { pipeline } from "node:stream/promises";

const TWEET_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "mobile.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);

export interface ParsedTweet {
  username: string;
  tweetId: string;
}

export function parseTweetUrl(input: string | null | undefined): ParsedTweet | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (!TWEET_HOSTS.has(url.hostname.toLowerCase())) return null;

  const match = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/i);
  if (!match) return null;

  return { username: match[1], tweetId: match[2] };
}

interface VxTwitterMedia {
  url: string;
  type: "image" | "video" | "gif";
}

interface VxTwitterResponse {
  media_extended?: VxTwitterMedia[];
}

export async function fetchTweetVideos(parsed: ParsedTweet, signal?: AbortSignal): Promise<string[]> {
  const { data } = await axios.get<VxTwitterResponse>(
    `https://api.vxtwitter.com/${encodeURIComponent(parsed.username)}/status/${parsed.tweetId}`,
    { timeout: 15000, signal },
  );
  return (data.media_extended ?? []).filter((m) => m.type === "video" || m.type === "gif").map((m) => m.url);
}

export interface FilenameVars {
  username: string;
  tweetId: string;
  index: number;
  date: string;
}

export function formatFilename(template: string, vars: FilenameVars): string {
  const replaced = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    switch (key) {
      case "username":
        return vars.username;
      case "tweetId":
        return vars.tweetId;
      case "index":
        return String(vars.index);
      case "date":
        return vars.date;
      default:
        return "";
    }
  });
  return sanitizeFilename(replaced) || `${vars.username}_${vars.tweetId}`;
}

function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex
  const controlAndReserved = /[\\/:*?"<>|\x00-\x1f]/g;
  return name.replace(controlAndReserved, "_").trim().slice(0, 200);
}

export async function downloadVideo(
  videoUrl: string,
  destination: string,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await axios.get(videoUrl, {
    responseType: "stream",
    signal,
    onDownloadProgress: (event) => {
      if (onProgress && typeof event.progress === "number") {
        onProgress(event.progress);
      }
    },
  });
  try {
    await pipeline(response.data, createWriteStream(destination));
  } catch (error) {
    await unlink(destination).catch(() => {});
    throw error;
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ensureUniquePath(target: string): string {
  if (!existsSync(target)) return target;
  const { dir, name, ext } = parse(target);
  for (let i = 2; i < 1000; i++) {
    const candidate = resolve(dir, `${name} (${i})${ext}`);
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error(`Too many duplicate files for: ${target}`);
}
