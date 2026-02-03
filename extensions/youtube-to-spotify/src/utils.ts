import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";

const {
  downloadPath,
  homebrewPath,
  ytdlPath: ytdlPathPreference,
  ffmpegPath: ffmpegPathPreference,
  ffprobePath: ffprobePathPreference,
} = getPreferenceValues<Preferences>();

export const MAX_VIDEO_DURATION = 480; // 8 minutes in seconds

export { downloadPath, homebrewPath };

export function getytdlPath() {
  if (ytdlPathPreference && existsSync(ytdlPathPreference)) return ytdlPathPreference;
  return "/opt/homebrew/bin/yt-dlp";
}

export function getffmpegPath() {
  if (ffmpegPathPreference && existsSync(ffmpegPathPreference)) return ffmpegPathPreference;
  return "/opt/homebrew/bin/ffmpeg";
}

export function getffprobePath() {
  if (ffprobePathPreference && existsSync(ffprobePathPreference)) return ffprobePathPreference;
  return "/opt/homebrew/bin/ffprobe";
}

export function isValidYouTubeUrl(url: string) {
  if (!url || url.trim() === "") return false;

  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    const hostname = urlObj.hostname.toLowerCase();

    if (!hostname.includes("youtube.com") && !hostname.includes("youtu.be")) {
      return false;
    }

    if (urlObj.pathname.includes("/shorts/")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function sanitizeMetadata(text: string) {
  const maxLen = 100;
  const invalidChars = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"];

  let safe = text.trim();
  for (const char of invalidChars) {
    safe = safe.replaceAll(char, "");
  }

  safe = Array.from(safe)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join("");

  safe = safe.replace(/\s+/g, " ");
  safe = safe.slice(0, maxLen);

  return safe.trim() || "unknown";
}

export function sanitizeVideoTitle(name: string) {
  const maxLen = 200;
  const invalidChars = [":"];

  // Trim and remove invalid characters
  let safe = name.trim();
  for (const char of invalidChars) {
    safe = safe.replaceAll(char, "");
  }

  // Remove control characters
  safe = Array.from(safe)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join("");

  // Replace double or more spaces with single space
  safe = safe.replace(/\s+/g, " ");

  // Hard truncate to max length
  safe = safe.slice(0, maxLen);

  // Truncate to max length at a sensible boundary if possible (like a punctuation mark)
  const cutoffSymbols = /[.!?]/g;
  const match = [...safe.matchAll(cutoffSymbols)]
    .map((m) => m.index)
    .filter((idx) => idx !== undefined && idx <= maxLen);

  if (match.length > 0) {
    safe = safe.slice(0, match[match.length - 1]);
  }

  return safe.trim() || "untitled";
}
