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

/**
 * The video formats from yt-dlp metadata, best-first (yt-dlp lists them
 * worst-first). Audio-only formats are excluded — the exact-format dropdown and
 * the AI tool's best-format pick both want a video stream; the audio-only path
 * composes its own `bestaudio` selector instead of picking a concrete format.
 */
export const getVideoFormats = (video?: Video): Format[] => {
  if (!video) return [];
  return video.formats
    .slice()
    .reverse()
    .filter((format) => hasCodec(format).hasVcodec);
};

export const getFormatValue = (format: Format) => {
  const { hasAcodec } = hasCodec(format);
  const audio = hasAcodec ? "" : "+bestaudio";
  const targetExt = `#${format.ext}`;
  return format.format_id + audio + targetExt;
};

export const getFormatTitle = (format: Format) =>
  [format.resolution, format.ext, formatTbr(format.tbr), formatFilesize(format.filesize, format.filesize_approx)]
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

  // Truncate to max length only when the title actually exceeds it, preferring
  // the last sentence boundary (.!?) inside the cap. The boundary cut must stay
  // inside this branch: applied unconditionally it chopped every short title at
  // its last punctuation mark ("Mr. Robot S01E01" became "Mr").
  if (safe.length > maxLen) {
    safe = safe.slice(0, maxLen);
    const cutoff = Math.max(safe.lastIndexOf("."), safe.lastIndexOf("!"), safe.lastIndexOf("?"));
    if (cutoff > 0) {
      safe = safe.slice(0, cutoff);
    }
  }

  return safe.trim() || "untitled";
}
