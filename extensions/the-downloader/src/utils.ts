import * as fs from "node:fs";
import * as os from "node:os";
import { getPreferenceValues, environment } from "@raycast/api";
import { formatDuration, intervalToDuration } from "date-fns";
import { Format, Video } from "./types.js";
import { execSync } from "child_process";
import { findHomebrewPath, resolveBinary, isWindows, isMac } from "./lib/binary.js";
import { windowsWingetPath } from "./lib/platform-paths.js";
import { DEFAULT_IDLE_MS } from "./lib/run.js";
import { isValidUrl, normalizeUrl } from "./lib/url.js";

export { isWindows, isMac, isValidUrl, normalizeUrl };

function sanitizeWindowsPath(path: string): string {
  return path.replace(/\r/g, "").replace(/\n/g, "").trim();
}

const prefs = getPreferenceValues<ExtensionPreferences>();

export const {
  homebrewPath: homebrewPathPreference,
  autoLoadUrlFromClipboard,
  autoLoadUrlFromSelectedText,
  enableBrowserExtensionSupport,
  forceIpv4,
  networkIdleTimeoutSec,
  ytdlPath: ytdlPathPreference,
  ffmpegPath: ffmpegPathPreference,
  ffprobePath: ffprobePathPreference,
  galleryDlPath: galleryDlPathPreference,
  spotDlPath: spotDlPathPreference,
  denoPath: denoPathPreference,
  monolithPath: monolithPathPreference,
} = prefs;

/**
 * Expand a leading `~` (followed by a path separator or end-of-string) to the
 * user's home directory. The `downloadPath` preference defaults to the literal
 * string `~/Downloads`; execa spawns binaries with no shell, so a bare `~` is
 * never expanded downstream — yt-dlp/monolith would write into a literal `~`
 * folder relative to the cwd. Expanding here makes the out-of-box default work
 * on first run without the user touching the directory picker. `~user`-style
 * specs (no separator after the tilde) are left untouched.
 */
export function expandTilde(p: string): string {
  return p.replace(/^~(?=$|[/\\])/, os.homedir());
}

/** The configured download folder, with a leading `~` expanded to the home directory. */
export const downloadPath = expandTilde(prefs.downloadPath);

/**
 * Resolve the watchdog idle window for child-process spawns. Reads
 * `networkIdleTimeoutSec` from preferences and falls back to 120 seconds when
 * the value is missing, non-numeric, or non-positive — defensive because the
 * preference is a free-form text field.
 */
export function getIdleTimeoutMs(): number {
  const parsed = Number(networkIdleTimeoutSec);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 1000) : DEFAULT_IDLE_MS;
}

/**
 * Resolve the Homebrew CLI. Honors the user's preference when it exists on
 * disk (covers custom installs and multi-user setups); otherwise falls back
 * to auto-detection so an Intel Mac with the Apple-Silicon default still
 * works without the user fixing the preference.
 */
export function getHomebrewPath(): string {
  if (homebrewPathPreference && fs.existsSync(homebrewPathPreference)) {
    return homebrewPathPreference;
  }
  return findHomebrewPath();
}

export async function getWingetPath() {
  // PATH lookup first — it's fast and authoritative when winget's directory
  // is on PATH (the normal case in a shell).
  try {
    const wingetPath = sanitizeWindowsPath(execSync("where winget").toString().trim());
    if (wingetPath) return wingetPath.split("\n")[0];
  } catch {
    /* fall through to the canonical-install-location fallback */
  }
  // Raycast's extension process on Windows often strips PATH, so `where`
  // returns nothing even though winget is installed. winget ships via MSIX
  // into a stable WindowsApps launcher dir regardless of which version is
  // on PATH, so checking that dir directly recovers the common case.
  const canonical = windowsWingetPath();
  if (canonical && fs.existsSync(canonical)) return canonical;
  throw new Error("Winget not found. Please ensure winget is installed and available in your PATH.");
}

export const getytdlPath = () => resolveBinary("yt-dlp", ytdlPathPreference);
export const getffmpegPath = () => resolveBinary("ffmpeg", ffmpegPathPreference);
export const getffprobePath = () => resolveBinary("ffprobe", ffprobePathPreference);
export const getGalleryDlPath = () => resolveBinary("gallery-dl", galleryDlPathPreference);
export const getDenoPath = () => resolveBinary("deno", denoPathPreference);
export const getSpotdlPath = () => resolveBinary("spotdl", spotDlPathPreference, environment.supportPath);
export const getMonolithPath = () => resolveBinary("monolith", monolithPathPreference);

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
  // Path separators (`/`, `\`) are never valid in a single filename component
  // on ANY platform, so strip them everywhere — not just on Windows. The output
  // of this function is used directly as a filename (e.g. the transcript write
  // `${title}.txt`), where a leftover `/` on macOS would turn "AC/DC" into a
  // bogus subpath (ENOENT) or let a remote-controlled title escape the folder.
  const invalidChars = isWindows ? ["<", ">", ":", '"', "/", "\\", "|", "?", "*"] : ["/", "\\", ":"];

  // Trim and remove invalid characters
  let safe = name.trim();
  for (const char of invalidChars) {
    safe = safe.replaceAll(char, "");
  }

  // Remove control characters
  safe = Array.from(safe)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join("");

  // Collapse leading dots so a title like "..foo" can't produce a hidden file
  // or a `..` path-traversal segment once it becomes a filename.
  safe = safe.replace(/^\.+/, "");

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
