import { getPreferenceValues } from "@raycast/api";
import { formatDuration, intervalToDuration } from "date-fns";
import validator from "validator";
import { Format, Video } from "./types.js";
import { existsSync } from "fs";
import { execSync } from "child_process";

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

function sanitizeWindowsPath(path: string): string {
  return path.replace(/\r/g, "").replace(/\n/g, "").trim();
}

export const {
  downloadPath,
  homebrewPath,
  autoLoadUrlFromClipboard,
  autoLoadUrlFromSelectedText,
  enableBrowserExtensionSupport,
  forceIpv4,
  ytdlPath: ytdlPathPreference,
  ffmpegPath: ffmpegPathPreference,
  ffprobePath: ffprobePathPreference,
} = getPreferenceValues<ExtensionPreferences>();

export async function getWingetPath() {
  try {
    const wingetPath = sanitizeWindowsPath(execSync("where winget").toString().trim());
    return wingetPath.split("\n")[0];
  } catch {
    throw new Error("Winget not found. Please ensure winget is installed and available in your PATH.");
  }
}

export const getytdlPath = () => {
  const cleanedYtdlPath = isWindows ? sanitizeWindowsPath(ytdlPathPreference || "") : ytdlPathPreference;
  if (cleanedYtdlPath && existsSync(cleanedYtdlPath)) return cleanedYtdlPath;

  try {
    const defaultPath = isMac
      ? "/opt/homebrew/bin/yt-dlp"
      : isWindows
        ? sanitizeWindowsPath(execSync("where yt-dlp").toString().trim().split("\n")[0])
        : "/usr/bin/yt-dlp";

    return defaultPath;
  } catch {
    return "";
  }
};

export const getffmpegPath = () => {
  const cleanedFfmpegPath = isWindows ? sanitizeWindowsPath(ffmpegPathPreference || "") : ffmpegPathPreference;
  if (cleanedFfmpegPath && existsSync(cleanedFfmpegPath)) return cleanedFfmpegPath;

  try {
    const defaultPath = isMac
      ? "/opt/homebrew/bin/ffmpeg"
      : isWindows
        ? sanitizeWindowsPath(execSync("where ffmpeg").toString().trim().split("\n")[0])
        : "/usr/bin/ffmpeg";

    return defaultPath;
  } catch {
    return "";
  }
};

export const getffprobePath = () => {
  const cleanedFfprobePath = isWindows ? sanitizeWindowsPath(ffprobePathPreference || "") : ffprobePathPreference;

  if (cleanedFfprobePath && existsSync(cleanedFfprobePath)) return cleanedFfprobePath;

  try {
    const defaultPath = isMac
      ? "/opt/homebrew/bin/ffprobe"
      : isWindows
        ? sanitizeWindowsPath(execSync("where ffprobe").toString().trim().split("\n")[0])
        : "/usr/bin/ffprobe";
    return defaultPath;
  } catch {
    return "";
  }
};

export type DownloadOptions = {
  url: string;
  format: string;
  copyToClipboard: boolean;
  startTime?: string;
  endTime?: string;
};

export function formatHHMM(seconds: number) {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });

  return formatDuration(duration, {
    format: duration.hours && duration.hours > 0 ? ["hours", "minutes", "seconds"] : ["minutes", "seconds"],
    zero: true,
    delimiter: ":",
    locale: {
      formatDistance: (_token, count) => String(count).padStart(2, "0"),
    },
  });
}

export function parseHHMM(input: string) {
  const parts = input.split(":");
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return parseInt(minutes) * 60 + parseInt(seconds);
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return parseInt(hours) * 60 * 60 + parseInt(minutes) * 60 + parseInt(seconds);
  }
  throw new Error("Invalid input");
}

export function isValidHHMM(input: string) {
  try {
    if (input) {
      parseHHMM(input);
    }
    return true;
  } catch {
    return false;
  }
}

export function isValidUrl(url: string) {
  return validator.isURL(url, { require_protocol: false });
}

export function formatTbr(tbr: number | null) {
  if (!tbr) return "";
  return `${Math.floor(tbr)} kbps`;
}

export function formatFilesize(filesize?: number, filesizeApprox?: number) {
  const size = filesize || filesizeApprox;
  if (!size) return "";

  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 ** 2) {
    return `${(size / 1024).toFixed(2)} KiB`;
  }
  if (size < 1024 ** 3) {
    return `${(size / 1024 ** 2).toFixed(2)} MiB`;
  }
  return `${(size / 1024 ** 3).toFixed(2)} GiB`;
}

const hasCodec = ({ vcodec, acodec }: Format) => {
  return {
    hasVcodec: Boolean(vcodec) && vcodec !== "none",
    hasAcodec: Boolean(acodec) && acodec !== "none",
  };
};

export const getFormats = (video?: Video) => {
  const videoKey = "Video";
  const audioOnlyKey = "Audio Only";
  const videoWithAudio: Format[] = [];
  const audioOnly: Format[] = [];

  if (!video) return { [videoKey]: videoWithAudio, [audioOnlyKey]: audioOnly };

  for (const format of video.formats.slice().reverse()) {
    const { hasAcodec, hasVcodec } = hasCodec(format);
    if (hasVcodec) videoWithAudio.push(format);
    else if (hasAcodec && !hasVcodec) audioOnly.push(format);
    else continue;
  }

  return { [videoKey]: videoWithAudio, [audioOnlyKey]: audioOnly };
};

export const getFormatValue = (format: Format) => {
  const { hasAcodec } = hasCodec(format);
  const audio = hasAcodec ? "" : "+bestaudio";
  const targetExt = `#${format.ext}`;
  return format.format_id + audio + targetExt;
};

export const getFormatTitle = (format: Format) =>
  [format.resolution, format.ext, formatTbr(format.tbr), formatFilesize(format.filesize)]
    .filter((x) => Boolean(x))
    .join(" | ");

export function sanitizeVideoTitle(name: string): string {
  const maxLen = 200;
  const invalidChars = isWindows ? ["<", ">", ":", '"', "/", "\\", "|", "?", "*"] : [":"];

  // Trim and remove invalid characters
  let safe = name.trim();
  for (const char of invalidChars) {
    safe = safe.replaceAll(char, "");
  }

  // Remove control characters
  safe = Array.from(safe)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join("");

  // Remove trailing dots and spaces on Windows
  if (isWindows) safe = safe.replace(/[. ]+$/, "");

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
