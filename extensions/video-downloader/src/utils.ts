import { Clipboard, getPreferenceValues, showHUD, Toast } from "@raycast/api";
import { formatDuration, intervalToDuration } from "date-fns";
import validator from "validator";
import { Format, Video } from "./types.js";
import { existsSync } from "fs";
import { execSync } from "child_process";

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

// A downloaded file path is reported by yt-dlp's `--print after_move:filepath`
// on stdout. Detect it cross-platform: an absolute POSIX path on macOS/Linux,
// or a drive-letter path (e.g. C:\...) on Windows.
export function looksLikeFilePath(line: string): boolean {
  return isWindows ? /^[a-zA-Z]:\\/.test(line) : line.startsWith("/");
}

// Whether a URL points at (or into) a playlist. YouTube and most sites carry a
// `list=` query param on playlist/“watch in playlist” URLs. Used to offer an
// opt-in "download entire playlist" choice; without it we pass --no-playlist so
// a single shared link doesn't pull down the whole list.
export function hasPlaylist(url: string): boolean {
  try {
    return new URL(url).searchParams.has("list");
  } catch {
    // Not a fully-qualified URL (validator allows protocol-less input) — fall
    // back to a substring check on the query portion.
    return /[?&]list=/.test(url);
  }
}

// Pull the raw yt-dlp output from an error. execa puts the command line in
// `error.message`/`shortMessage` (noise we don't want to show) and the actual
// yt-dlp output in `error.stderr` — prefer that.
function getYtdlpStderr(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string") {
    return error.stderr;
  }
  return error instanceof Error ? error.message : String(error);
}

export type FriendlyError = {
  title: string;
  message: string;
  // Whether retrying the same URL could plausibly help. Transient failures
  // (rate limits, network) are retryable; "unsupported site" / "unavailable"
  // are not, so the UI can hide a misleading "Try Again".
  retryable: boolean;
};

// Turn a raw yt-dlp/execa failure into a human-readable title + message and a
// retryable flag, instead of dumping the full `execa` command line at the user.
export function describeYtdlpError(error: unknown): FriendlyError {
  const stderr = getYtdlpStderr(error);
  // yt-dlp prints the real cause on a line starting with "ERROR:"; surface that
  // rather than the "Command failed with exit code 1: /opt/homebrew/bin/…" line.
  const errorLine =
    stderr
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("ERROR:"))
      ?.replace(/^ERROR:\s*/, "") ?? stderr.trim();

  const lower = errorLine.toLowerCase();

  if (lower.includes("unsupported url")) {
    return {
      title: "Unsupported Site",
      message: "This URL isn't from a site Video Downloader can download from. Check the supported sites list.",
      retryable: false,
    };
  }
  if (lower.includes("unable to download") && lower.includes("404")) {
    return { title: "Video Not Found", message: "This video doesn't exist or has been removed.", retryable: false };
  }
  // yt-dlp emits "members only" (with a space, e.g. "Premium members only",
  // "Channel members only"), not "members-only"; also covers private videos,
  // login prompts, and channel-membership gates.
  if (
    lower.includes("private") ||
    lower.includes("members only") ||
    lower.includes("sign in") ||
    lower.includes("login required") ||
    lower.includes("join this channel")
  ) {
    return {
      title: "Video Requires Sign-In",
      message: "This video is private or restricted. Try the “Use Cookies from Browser” preference.",
      retryable: false,
    };
  }
  if (lower.includes("unavailable") || lower.includes("removed") || lower.includes("deleted")) {
    return { title: "Video Unavailable", message: "This video is no longer available.", retryable: false };
  }
  // Match real rate-limiting messages with a word boundary so "bitrate",
  // "framerate", "sample rate", etc. don't get misclassified as transient.
  if (lower.includes("bad guest token") || /\brate[ -]?limit/.test(lower) || lower.includes("429")) {
    return {
      title: "Temporary Rate Limit",
      message: "The site is rate-limiting requests. Try again, or set the “Use Cookies from Browser” preference.",
      retryable: true,
    };
  }

  // Unknown failure: show the cleaned error line and allow a retry.
  return { title: "Couldn't Load Video", message: errorLine || "yt-dlp could not read this URL.", retryable: true };
}

// Standard "copy to clipboard" toast action, shared so the shortcut, HUD, and
// wording stay consistent across the failure/success toasts.
export function copyToClipboardAction(title: string, text: string, hud = "Copied to Clipboard"): Toast.ActionOptions {
  return {
    title,
    shortcut: { modifiers: ["cmd", "shift"], key: "c" },
    onAction: () => {
      Clipboard.copy(text);
      showHUD(hud);
    },
  };
}

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
  cookiesFromBrowser,
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
  downloadPlaylist?: boolean;
};

// Shared yt-dlp arguments applied to every invocation (metadata, download,
// transcript). Centralizes the network/extractor resilience flags so they stay
// consistent across call sites.
//
// Why these flags:
// - X/Twitter rate-limits anonymous "guest token" access, surfacing as
//   "Bad guest token". `--cookies-from-browser` makes yt-dlp use the user's
//   logged-in session instead, which is the durable fix. (Opt-in preference.)
// - `--extractor-retries` retries known extractor errors. Gated behind
//   `throttle` so a genuinely-failing *download* doesn't retry the extractor
//   three times before reporting failure (the interactive download already has
//   a manual "Try Again"); metadata lookups keep the retries.
// - `--sleep-requests` spaces out *API* requests to avoid tripping rate limits.
//   Also gated behind `throttle`: it must NOT be applied to downloads, where it
//   would sleep before every media segment (e.g. +1s × hundreds of HLS
//   segments). Use `throttle: true` only for extractor/metadata calls, where
//   the retries and throttling actually help.
export function getCommonArgs({ throttle = false }: { throttle?: boolean } = {}): string[] {
  const args: string[] = [];

  if (forceIpv4) args.push("--force-ipv4");
  if (cookiesFromBrowser && cookiesFromBrowser !== "none") {
    args.push("--cookies-from-browser", cookiesFromBrowser);
  }
  if (throttle) {
    args.push("--extractor-retries", "3");
    args.push("--sleep-requests", "1");
  }

  return args;
}

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

export const MP3_FORMAT_ID = "bestaudio#mp3";

const mp3Format: Format = {
  format_id: "bestaudio",
  ext: "mp3",
  video_ext: "none",
  protocol: "https",
  resolution: "audio only",
  vcodec: "none",
  acodec: "mp3",
  tbr: null,
  filesize: undefined,
  filesize_approx: undefined,
};

export const getFormats = (video?: Video) => {
  const videoKey = "Video";
  const audioOnlyKey = "Audio Only";
  const videoWithAudio: Format[] = [];
  const audioOnly: Format[] = [];

  if (!video) return { [videoKey]: videoWithAudio, [audioOnlyKey]: audioOnly };

  audioOnly.push(mp3Format);

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

  // Cap the length. If we have to cut, prefer the last word boundary before the
  // limit so we don't slice mid-word — but only when the title actually exceeds
  // maxLen. (The previous version cut at the last ".!?" anywhere in the title,
  // which truncated "Dr. Mehmet Oz…" to "Dr" and "U.S. Economy" to "U.S".)
  if (safe.length > maxLen) {
    safe = safe.slice(0, maxLen);
    const lastSpace = safe.lastIndexOf(" ");
    if (lastSpace > 0) {
      safe = safe.slice(0, lastSpace);
    }
  }

  return safe.trim() || "untitled";
}
