import { Clipboard, getPreferenceValues, showHUD, Toast } from "@raycast/api";
import { formatDuration, intervalToDuration } from "date-fns";
import validator from "validator";
import { Format, Video } from "./types.js";
import { existsSync } from "fs";
import { execSync } from "child_process";
import { homedir } from "os";
import { delimiter, dirname } from "path";

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
      // "ERROR: [youtube] <video id>: <message>": the extractor tag and video ID
      // mean nothing to a user, so keep only the message.
      ?.replace(/^ERROR:\s*(\[[^\]]+\]\s*([\w-]+:\s)?)?/, "") ?? stderr.trim();

  const lower = errorLine.toLowerCase();

  if (lower.includes("is not a valid url")) {
    return {
      title: "Not a Video Link",
      message: "Paste the link to a video page, starting with https://.",
      retryable: false,
    };
  }
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
  downloadPath: downloadPathPreference,
  homebrewPath,
  autoLoadUrlFromClipboard,
  autoLoadUrlFromSelectedText,
  enableBrowserExtensionSupport,
  forceIpv4,
  cookiesFromBrowser,
  ytdlPath: ytdlPathPreference,
  ffmpegPath: ffmpegPathPreference,
  ffprobePath: ffprobePathPreference,
  fastRemux = true,
} = getPreferenceValues<ExtensionPreferences>();

// The directory preference can hold a literal "~/..." path (its default is
// "~/Downloads"). yt-dlp expands "~" itself, but Node's fs APIs don't, so
// using the raw value with fs.mkdirSync fails with
// ENOENT: no such file or directory, mkdir '~/Downloads/...'.
export const downloadPath = downloadPathPreference.replace(/^~(?=$|[/\\])/, homedir());

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

// Raycast launches commands with a minimal PATH, so yt-dlp can't find the
// JavaScript runtime (deno) it needs for YouTube, and silently falls back to
// fewer formats. Homebrew installs deno next to yt-dlp, so put yt-dlp's own
// directory on the PATH it sees.
export const getYtdlpEnv = (ytdlPath: string) => ({
  ...process.env,
  PYTHONUNBUFFERED: "1",
  PATH: [dirname(ytdlPath), process.env.PATH].filter(Boolean).join(delimiter),
});

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

// Unlisted Vimeo share links (vimeo.com/<id>/<hash>) make yt-dlp use Vimeo's web
// client, which fails with "The web client only works when logged-in". The same
// video is public through the player URL with the hash passed as `h`.
export function normalizeVideoUrl(url: string): string {
  const match = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)\/([0-9a-f]+)(?:[/?#]|$)/i.exec(url.trim());
  return match ? `https://player.vimeo.com/video/${match[1]}?h=${match[2]}` : url;
}

// yt-dlp sets `live_status` to null when the extractor can't tell (e.g. Vimeo),
// so only reject streams that are actually live or scheduled.
export function isLiveStream(video: { live_status?: string | null }): boolean {
  return video.live_status === "is_live" || video.live_status === "is_upcoming";
}

// Harmless yt-dlp warnings that would only confuse users in the form.
export function isNoisyWarning(line: string): boolean {
  // Vimeo's DASH manifest isn't XML; yt-dlp falls back to HLS and downloads fine.
  return /Failed to parse XML/.test(line);
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

  // When the Audio Language dropdown is offered, list each track family once,
  // in the original language; the dropdown picks the language at download time.
  // A family with no original-language copy is left whole rather than hidden.
  const original = getAudioLanguages(video)?.original;
  const familiesWithOriginal = new Set(
    video.formats.filter((format) => trackFamily(format) && format.language === original).map(trackFamily),
  );
  const isOtherLanguageCopy = (format: Format) =>
    familiesWithOriginal.has(trackFamily(format)) && format.language !== original;

  for (const format of video.formats.slice().reverse()) {
    if (isOtherLanguageCopy(format)) continue;
    const { hasAcodec, hasVcodec } = hasCodec(format);
    if (hasVcodec) videoWithAudio.push(format);
    else if (hasAcodec && !hasVcodec) audioOnly.push(format);
    else continue;
  }

  return { [videoKey]: videoWithAudio, [audioOnlyKey]: audioOnly };
};

// Auto-dubbed YouTube videos list each audio-carrying format once per language
// track: yt-dlp suffixes the IDs ("140-3", "96-12", "140-drc") and YouTube marks
// one track original. The family is the shared ID ("140", "96").
const trackFamily = (format: Format) =>
  hasCodec(format).hasAcodec && format.language ? /^(.+)-(?:\d+|drc)$/.exec(format.format_id)?.[1] : undefined;

export type AudioLanguages = { original: string; options: { code: string; name: string }[] };

// The audio languages to offer, original first, or undefined when the video has
// no dubbed tracks. A language tag alone isn't proof of a dub (single-language
// sites tag their formats too), so this needs a track marked original.
export function getAudioLanguages(video?: Video): AudioLanguages | undefined {
  const original = video?.formats.find((format) => trackFamily(format) && isOriginalTrack(format))?.language;
  if (!video || !original) return undefined;
  // YouTube can list the original track twice, under "en-US" and plain "en", at
  // the same bitrate; a track in the original's language is never a dub.
  const others = new Set<string>();
  for (const format of video.formats) {
    if (trackFamily(format) && format.language && baseLanguage(format.language) !== baseLanguage(original)) {
      others.add(format.language);
    }
  }
  if (others.size === 0) return undefined;
  const options = [...others]
    .map((code) => ({ code, name: formatLanguage(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { original, options: [{ code: original, name: `${formatLanguage(original)} (original)` }, ...options] };
}

// The --format selector that downloads a format in a given audio language
// (original or dubbed): the same family's copy in that language, or for a
// video-only stream (or MP3), the best audio-only track in that language. Naming
// the original explicitly keeps it from depending on yt-dlp's own ranking.
// Undefined when the format can't be had in that language, e.g. a format with
// its own fixed soundtrack, or a DRC copy of a dub (dubbed tracks have none).
export function getLanguageFormatSelector(format: Format, video: Video, language: string) {
  const { hasVcodec, hasAcodec } = hasCodec(format);
  const family = trackFamily(format);
  if (family) {
    return video.formats.find(
      (other) =>
        trackFamily(other) === family && other.language === language && isDrcTrack(other) === isDrcTrack(format),
    )?.format_id;
  }
  if (hasAcodec && getFormatValue(format) !== MP3_FORMAT_ID) return undefined;
  const hasAudio = video.formats.some((other) => !hasCodec(other).hasVcodec && other.language === language);
  if (!hasAudio) return undefined;
  if (!hasVcodec) return `ba[language=${language}]`;
  return format.ext === "webm"
    ? `${format.format_id}+ba[ext=webm][language=${language}]/${format.format_id}+ba[language=${language}]`
    : `${format.format_id}+ba[language=${language}]`;
}

export const getFormatValue = (format: Format) => {
  const { hasAcodec } = hasCodec(format);
  const id = format.format_id;
  const targetExt = `#${format.ext}`;
  if (hasAcodec) {
    return `${id}${targetExt}`;
  }

  const downloadFormat =
    format.ext === "webm"
      ? `${id}+ba[ext=webm]/${id}+ba[acodec^=opus]/${id}+ba[acodec^=vorbis]/${id}+bestaudio`
      : `${id}+bestaudio`;

  return `${downloadFormat}${targetExt}`;
};

const codecNames: Record<string, string> = {
  avc1: "H.264",
  hev1: "HEVC",
  hvc1: "HEVC",
  vp09: "VP9",
  vp9: "VP9",
  av01: "AV1",
  mp4a: "AAC",
  opus: "Opus",
  vorbis: "Vorbis",
};

function formatCodec(format: Format) {
  const { hasVcodec } = hasCodec(format);
  const codec = (hasVcodec ? format.vcodec : format.acodec)?.split(".")[0];
  if (!codec || codec === "none" || codec === format.ext) return "";
  return codecNames[codec] ?? codec;
}

function formatDynamicRange(format: Format) {
  return format.dynamic_range && format.dynamic_range !== "SDR" ? format.dynamic_range : "";
}

function formatFps(fps?: number | null) {
  return fps && fps > 30 ? `${Math.round(fps)}fps` : "";
}

// A shorter size, so dropdown rows fit.
function formatShortFilesize(filesize?: number) {
  const size = formatFilesize(filesize);
  const [value, unit] = size.split(" ");
  if (!unit) return size;
  const number = Number(value);
  return `${number >= 10 ? Math.round(number) : number.toFixed(1)} ${unit}`;
}

// The container already implies these codecs, so the row can leave them out.
const impliedAudioCodecs: Record<string, string> = { m4a: "AAC", webm: "Opus", mp3: "MP3" };

const languageNames = new Intl.DisplayNames(["en"], { type: "language", style: "short" });

// `base` drops the region ("pt-BR" -> "Portuguese") to keep dropdown rows short;
// the Audio Language dropdown uses the full name ("Brazilian Portuguese").
export function formatLanguage(language?: string | null, { base = false } = {}) {
  if (!language) return "";
  try {
    return languageNames.of(base ? new Intl.Locale(language).language : language) ?? language;
  } catch {
    return language;
  }
}

const baseLanguage = (language?: string | null) => language?.split("-")[0].toLowerCase();

const isOriginalTrack = (format: Format) => Boolean(format.format_note?.includes("original"));

// "-drc" marks YouTube's dynamic-range-compressed (stable volume) copy of a track.
const isDrcTrack = (format: Format) => format.format_id.endsWith("-drc");

// The row leads with what tells formats apart at a glance: the resolution for
// video, and for audio the language. Videos with several audio tracks (e.g.
// auto-dubbed YouTube videos) list every audio format once per language, so
// those rows would otherwise be indistinguishable. Everything else goes in
// parentheses to keep the row short enough for the dropdown.
export const getFormatTitle = (format: Format, { showVideoLanguage = true } = {}) => {
  const { hasVcodec, hasAcodec } = hasCodec(format);
  const language = hasAcodec ? formatLanguage(format.language, { base: true }) : "";
  const lead = hasVcodec ? format.resolution : language || format.resolution;
  const traits = [
    // Video rows name a built-in soundtrack only when it isn't the original.
    hasVcodec && showVideoLanguage && !isOriginalTrack(format) ? language : "",
    hasVcodec ? formatFps(format.fps) : "",
    hasVcodec ? formatDynamicRange(format) : "",
    !hasVcodec && language && isOriginalTrack(format) ? "original" : "",
    !hasVcodec && isDrcTrack(format) ? "DRC" : "",
    format.ext,
    hasVcodec || impliedAudioCodecs[format.ext] !== formatCodec(format) ? formatCodec(format) : "",
    formatTbr(format.tbr),
    formatShortFilesize(format.filesize),
  ].filter(Boolean);
  return traits.length ? `${lead} (${traits.join(", ")})` : lead;
};

// Titles for one dropdown section. Two different formats can still read the
// same (e.g. sizes that round alike), so any title shared by several formats
// gets each one's yt-dlp format ID rather than hiding either of them.
export const getFormatTitles = (formats: Format[]) => {
  // A video row names its built-in soundtrack's language only when the list
  // holds more than one; otherwise "English" on every row is noise.
  const videoLanguages = new Set(
    formats
      .filter((format) => hasCodec(format).hasVcodec && hasCodec(format).hasAcodec)
      .map((format) => baseLanguage(format.language)),
  );
  const showVideoLanguage = videoLanguages.size > 1;
  const titles = formats.map((format) => getFormatTitle(format, { showVideoLanguage }));
  const counts = new Map<string, number>();
  for (const title of titles) counts.set(title, (counts.get(title) ?? 0) + 1);
  return titles.map((title, i) =>
    (counts.get(title) ?? 0) > 1 ? `${title.replace(/\)$/, "")}, #${formats[i].format_id})` : title,
  );
};

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
