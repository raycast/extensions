import { spawn } from "node:child_process";
import {
  access,
  copyFile,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants, readdirSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type CaptionKind = "manual" | "automatic";
export type ExportFormat = "srt" | "vtt" | "txt" | "raw";
export type MediaFormat = "mp3" | "m4a" | "mp4";
export type Caption = {
  language: string;
  kind: CaptionKind;
  formats: string[];
};
export type Video = {
  id: string;
  title: string;
  url: string;
  captions: Caption[];
  thumbnail?: string;
  channel?: string;
  duration?: number;
  uploadDate?: string;
  /** How many videos a post has, when it has several, such as an Instagram carousel. */
  items?: number;
  isLive?: boolean;
  /** Photos in the post, largest size first found. */
  images?: PostImage[];
  /** How many photos the post has. */
  photos?: number;
  /** The post has photos but no video. */
  noVideo?: boolean;
};
export type PostImage = { url: string; width?: number; height?: number };
/** What a queued job needs to know about a video. */
export type VideoRef = Pick<
  Video,
  "id" | "title" | "url" | "items" | "isLive" | "photos"
>;
export type VideoPreview = {
  title?: string;
  channel?: string;
  thumbnail?: string;
};
export type Settings = {
  downloadDirectory?: string;
  ytDlpPath?: string;
  ffmpegPath?: string;
  whisperPath?: string;
  modelPath?: string;
  skipSilence?: boolean;
  vadModelPath?: string;
  notifyWhenDone?: boolean;
  /** A browser yt-dlp reads YouTube cookies from, or `none`. */
  browserCookies?: string;
  /** Load the video in the frontmost browser tab when the clipboard has no link. */
  browserTab?: boolean;
  whisperLanguage?: string;
  favoriteLanguages?: string;
  /** The extension's support folder, for files it downloads such as the VAD model. */
  supportPath?: string;
};

const youtubeHosts = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
];

/** Parses a link, adding `https://` when it has no scheme. */
function parseLink(input: string): URL | undefined {
  const value = input.trim();
  try {
    return new URL(
      /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`,
    );
  } catch {
    return undefined;
  }
}

export function youtubeId(input: string): string {
  const url = parseLink(input);
  if (!url) throw new Error("Enter a valid YouTube video URL.");
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Enter a YouTube video URL.");
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (youtubeHosts.includes(host)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (/^\/(shorts|live|embed)\//.test(url.pathname))
      id = url.pathname.split("/")[2];
  } else if (["youtu.be", "www.youtu.be"].includes(host))
    id = url.pathname.split("/")[1];
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id))
    throw new Error(
      "Enter a single YouTube video URL (watch, short, live or youtu.be).",
    );
  return id;
}

export function youtubeUrl(input: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId(input)}`;
}

export function isYoutubeUrl(input: string): boolean {
  try {
    youtubeId(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * A YouTube playlist or channel link, normalized, or undefined for anything
 * else. Channel links can name the Videos, Shorts or Live tab.
 */
export function youtubeCollectionUrl(input: string): string | undefined {
  const url = parseLink(input);
  if (
    !url ||
    !["https:", "http:"].includes(url.protocol) ||
    !youtubeHosts.includes(url.hostname.toLowerCase()) ||
    /\s/.test(input.trim())
  )
    return undefined;
  const list = url.searchParams.get("list");
  if (url.pathname === "/playlist" && list && /^[\w-]{2,}$/.test(list))
    return `https://www.youtube.com/playlist?list=${list}`;
  const channel =
    /^\/(@[^/]+|channel\/UC[\w-]{22}|c\/[^/]+|user\/[^/]+)(\/(?:videos|shorts|streams))?\/?$/i.exec(
      url.pathname,
    );
  return channel
    ? `https://www.youtube.com/${channel[1]}${channel[2] ?? ""}`
    : undefined;
}

/** The playlist a video link was opened from, such as `watch?v=…&list=…`. */
export function youtubePlaylistOf(input: string): string | undefined {
  if (!isYoutubeUrl(input)) return undefined;
  const list = parseLink(input)?.searchParams.get("list");
  return list && /^[\w-]{2,}$/.test(list)
    ? `https://www.youtube.com/playlist?list=${list}`
    : undefined;
}

/** A YouTube video, playlist or channel link. */
export function isYoutubeLink(input: string): boolean {
  return isYoutubeUrl(input) || Boolean(youtubeCollectionUrl(input));
}

/**
 * Popular sites yt-dlp downloads video and audio from. Their links load as
 * soon as they're pasted, like YouTube links; links to other sites load when
 * you press Return, since they may not have a video.
 */
const videoSites: [string, string[], RegExp?][] = [
  ["Instagram", ["instagram.com"], /^\/(?:[\w.]+\/)?(?:p|reels?|tv|stories)\//],
  ["X", ["x.com", "twitter.com"], /\/status(?:es)?\/\d+/],
  ["TikTok", ["vm.tiktok.com", "vt.tiktok.com"]],
  ["TikTok", ["tiktok.com"], /\/(?:video|photo|t)\//],
  ["Facebook", ["fb.watch"]],
  ["Facebook", ["facebook.com"], /\/(?:watch|videos?|reels?|share)\b/],
  ["Threads", ["threads.net", "threads.com"], /\/post\//],
  ["Bluesky", ["bsky.app"], /\/post\//],
  ["Reddit", ["v.redd.it"]],
  ["Reddit", ["reddit.com"], /\/comments\/|\/s\//],
  ["Twitch", ["clips.twitch.tv"]],
  ["Twitch", ["twitch.tv"], /\/(?:videos|clip)\//],
  ["Kick", ["kick.com"]],
  ["Bilibili", ["bilibili.com", "b23.tv"]],
  ["Vimeo", ["vimeo.com"]],
  ["Dailymotion", ["dailymotion.com", "dai.ly"]],
  ["SoundCloud", ["soundcloud.com"]],
  ["Bandcamp", ["bandcamp.com"]],
  ["Mixcloud", ["mixcloud.com"]],
  ["Streamable", ["streamable.com"]],
  ["Rumble", ["rumble.com"]],
  ["Pinterest", ["pinterest.com", "pin.it"]],
  ["Tumblr", ["tumblr.com"]],
  ["LinkedIn", ["linkedin.com"]],
  ["Snapchat", ["snapchat.com"]],
  ["Loom", ["loom.com"]],
  ["TED", ["ted.com"]],
  ["Internet Archive", ["archive.org"]],
  ["VK", ["vk.com", "vkvideo.ru"]],
  ["Niconico", ["nicovideo.jp"]],
  ["Weibo", ["weibo.com"]],
  ["Douyin", ["douyin.com"]],
];

/** The name of a known video site for a link with a path, such as `Instagram`. */
export function videoSite(input: string): string | undefined {
  const url = parseLink(input);
  if (
    !url ||
    !["https:", "http:"].includes(url.protocol) ||
    /\s/.test(input.trim()) ||
    url.pathname.length < 2
  )
    return undefined;
  const host = url.hostname.toLowerCase();
  return videoSites.find(
    ([, domains, content]) =>
      domains.some(
        (domain) => host === domain || host.endsWith(`.${domain}`),
      ) &&
      (!content || content.test(url.pathname)),
  )?.[0];
}

/** A link that loads as soon as it's pasted: YouTube, or a known video site. */
export function isMediaLink(input: string): boolean {
  return isYoutubeLink(input) || Boolean(videoSite(input));
}

export function mediaUrl(input: string): string {
  if (isYoutubeUrl(input)) return youtubeUrl(input);
  const collection = youtubeCollectionUrl(input);
  if (collection) return collection;
  const url = videoSite(input) ? parseLink(input) : undefined;
  if (url) return url.toString();
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid video URL.");
  }
  if (!["https:", "http:"].includes(parsed.protocol))
    throw new Error("Enter an HTTP or HTTPS video URL.");
  return parsed.toString();
}

/** Browsers whose frontmost tab AppleScript can read, by bundle ID. */
const scriptableBrowsers: Record<string, "safari" | "chromium"> = {
  "com.apple.Safari": "safari",
  "com.apple.SafariTechnologyPreview": "safari",
  "com.kagi.kagimacOS": "safari",
  "com.google.Chrome": "chromium",
  "com.google.Chrome.beta": "chromium",
  "com.google.Chrome.dev": "chromium",
  "com.google.Chrome.canary": "chromium",
  "org.chromium.Chromium": "chromium",
  "com.brave.Browser": "chromium",
  "com.brave.Browser.beta": "chromium",
  "com.brave.Browser.nightly": "chromium",
  "com.microsoft.edgemac": "chromium",
  "com.microsoft.edgemac.Beta": "chromium",
  "com.microsoft.edgemac.Dev": "chromium",
  "com.microsoft.edgemac.Canary": "chromium",
  "com.vivaldi.Vivaldi": "chromium",
  "com.operasoftware.Opera": "chromium",
  "com.operasoftware.OperaGX": "chromium",
  "company.thebrowser.Browser": "chromium",
  "company.thebrowser.dia": "chromium",
  "ai.perplexity.comet": "chromium",
};

/** Browsers that only the Raycast browser extension can read. */
const otherBrowsers = new Set([
  "org.mozilla.firefox",
  "org.mozilla.firefoxdeveloperedition",
  "org.mozilla.nightly",
  "app.zen-browser.zen",
]);

export function isBrowser(bundleId?: string): boolean {
  return Boolean(
    bundleId && (scriptableBrowsers[bundleId] || otherBrowsers.has(bundleId)),
  );
}

/** AppleScript that returns the address of a browser's frontmost tab. */
export function browserTabScript(bundleId: string): string | undefined {
  const kind = scriptableBrowsers[bundleId];
  if (!kind) return undefined;
  const app = `application id "${bundleId}"`;
  return kind === "safari"
    ? `tell ${app} to if (count of windows) > 0 then get URL of current tab of front window`
    : `tell ${app} to if (count of windows) > 0 then get URL of active tab of front window`;
}

/** The text that changed between two values of a text field. */
function insertedText(previous: string, next: string): string {
  let start = 0;
  while (
    start < previous.length &&
    start < next.length &&
    previous[start] === next[start]
  )
    start++;
  let end = 0;
  while (
    end < previous.length - start &&
    end < next.length - start &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  )
    end++;
  return next.slice(start, next.length - end);
}

/** Returns the video link a paste produced, or undefined for typing and edits. */
export function pastedMediaLink(
  previous: string,
  next: string,
): string | undefined {
  const pasted = insertedText(previous, next).trim();
  const value = next.trim();
  if (pasted.length < 2) return undefined;
  const key = (input: string) =>
    isYoutubeUrl(input)
      ? youtubeId(input)
      : (youtubeCollectionUrl(input) ??
        (videoSite(input) ? mediaUrl(input) : undefined));
  if (key(pasted)) return key(value) === key(pasted) ? value : pasted;
  return key(value) ? value : undefined;
}

/**
 * An absolute file path from search text. Accepts `~/`, surrounding quotes,
 * `file://` URLs and spaces escaped with a backslash, as Terminal writes them.
 */
export function localPath(input: string): string | undefined {
  let value = input.trim();
  if (/^(['"]).+\1$/.test(value)) value = value.slice(1, -1);
  if (/^file:\/\//i.test(value)) {
    try {
      return fileURLToPath(value);
    } catch {
      return undefined;
    }
  }
  if (value === "~" || value.startsWith("~/"))
    value = join(homedir(), value.slice(1));
  if (!value.startsWith("/")) return undefined;
  return value.replace(/\\([ '"()&!])/g, "$1");
}

/** Returns the search text a pasted file path produced, or undefined for typing and edits. */
export function pastedFilePath(
  previous: string,
  next: string,
): string | undefined {
  const pasted = insertedText(previous, next).trim();
  if (pasted.length < 2) return undefined;
  if (localPath(pasted)) return pasted;
  return localPath(next) ? next.trim() : undefined;
}

export function localFileInfo(
  path: string,
): { isFile: boolean; size: number; modified: Date } | undefined {
  try {
    const info = statSync(path);
    return { isFile: info.isFile(), size: info.size, modified: info.mtime };
  } catch {
    return undefined;
  }
}

const mediaExtensions = new Set(
  "3gp aac aif aiff amr avi caf flac flv m2ts m4a m4b m4v mka mkv mov mp2 mp3 mp4 mpeg mpg mts oga ogg opus ts wav webm wma wmv"
    .split(" ")
    .map((extension) => `.${extension}`),
);

export function isMediaFile(path: string): boolean {
  return mediaExtensions.has(extname(path).toLowerCase());
}

/**
 * The files to transcribe from chosen files and folders. Files are kept as
 * chosen; folders are searched, including subfolders, for audio and video
 * files. Hidden files and app bundles are skipped, and duplicates removed.
 */
export function mediaFiles(paths: string[], limit = 2000): string[] {
  const files = new Set<string>();
  let visited = 0;
  const visit = (path: string, chosen: boolean) => {
    if (files.size >= limit || ++visited > limit * 25) return;
    let info;
    try {
      info = statSync(path);
    } catch {
      return;
    }
    if (info.isFile()) {
      if (chosen || isMediaFile(path)) files.add(path);
      return;
    }
    if (
      !info.isDirectory() ||
      (!chosen && /\.(app|bundle|photoslibrary)$/i.test(path))
    )
      return;
    let entries: string[];
    try {
      entries = readdirSync(path);
    } catch {
      return;
    }
    entries
      .filter((entry) => !entry.startsWith("."))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .forEach((entry) => visit(join(path, entry), false));
  };
  paths.forEach((path) => visit(path, true));
  return [...files];
}

export function formatSize(bytes: number): string {
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return unit
    ? `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
    : `${bytes} bytes`;
}

/** Languages supported by whisper.cpp; codes are passed to whisper-cli with -l. */
export const whisperLanguages: { code: string; name: string }[] = [
  ["en", "English"],
  ["zh", "Chinese"],
  ["de", "German"],
  ["es", "Spanish"],
  ["ru", "Russian"],
  ["ko", "Korean"],
  ["fr", "French"],
  ["ja", "Japanese"],
  ["pt", "Portuguese"],
  ["tr", "Turkish"],
  ["pl", "Polish"],
  ["ca", "Catalan"],
  ["nl", "Dutch"],
  ["ar", "Arabic"],
  ["sv", "Swedish"],
  ["it", "Italian"],
  ["id", "Indonesian"],
  ["hi", "Hindi"],
  ["fi", "Finnish"],
  ["vi", "Vietnamese"],
  ["he", "Hebrew"],
  ["uk", "Ukrainian"],
  ["el", "Greek"],
  ["ms", "Malay"],
  ["cs", "Czech"],
  ["ro", "Romanian"],
  ["da", "Danish"],
  ["hu", "Hungarian"],
  ["ta", "Tamil"],
  ["no", "Norwegian"],
  ["th", "Thai"],
  ["ur", "Urdu"],
  ["hr", "Croatian"],
  ["bg", "Bulgarian"],
  ["lt", "Lithuanian"],
  ["la", "Latin"],
  ["mi", "Maori"],
  ["ml", "Malayalam"],
  ["cy", "Welsh"],
  ["sk", "Slovak"],
  ["te", "Telugu"],
  ["fa", "Persian"],
  ["lv", "Latvian"],
  ["bn", "Bengali"],
  ["sr", "Serbian"],
  ["az", "Azerbaijani"],
  ["sl", "Slovenian"],
  ["kn", "Kannada"],
  ["et", "Estonian"],
  ["mk", "Macedonian"],
  ["br", "Breton"],
  ["eu", "Basque"],
  ["is", "Icelandic"],
  ["hy", "Armenian"],
  ["ne", "Nepali"],
  ["mn", "Mongolian"],
  ["bs", "Bosnian"],
  ["kk", "Kazakh"],
  ["sq", "Albanian"],
  ["sw", "Swahili"],
  ["gl", "Galician"],
  ["mr", "Marathi"],
  ["pa", "Punjabi"],
  ["si", "Sinhala"],
  ["km", "Khmer"],
  ["sn", "Shona"],
  ["yo", "Yoruba"],
  ["so", "Somali"],
  ["af", "Afrikaans"],
  ["oc", "Occitan"],
  ["ka", "Georgian"],
  ["be", "Belarusian"],
  ["tg", "Tajik"],
  ["sd", "Sindhi"],
  ["gu", "Gujarati"],
  ["am", "Amharic"],
  ["yi", "Yiddish"],
  ["lo", "Lao"],
  ["uz", "Uzbek"],
  ["fo", "Faroese"],
  ["ht", "Haitian Creole"],
  ["ps", "Pashto"],
  ["tk", "Turkmen"],
  ["nn", "Nynorsk"],
  ["mt", "Maltese"],
  ["sa", "Sanskrit"],
  ["lb", "Luxembourgish"],
  ["my", "Myanmar"],
  ["bo", "Tibetan"],
  ["tl", "Tagalog"],
  ["mg", "Malagasy"],
  ["as", "Assamese"],
  ["tt", "Tatar"],
  ["haw", "Hawaiian"],
  ["ln", "Lingala"],
  ["ha", "Hausa"],
  ["ba", "Bashkir"],
  ["jw", "Javanese"],
  ["su", "Sundanese"],
  ["yue", "Cantonese"],
].map(([code, name]) => ({ code, name }));

/**
 * The whisper.cpp language to preselect: the best favorite language match,
 * then the fallback language (the Transcription Language preference), then auto.
 */
export function defaultWhisperLanguage(
  favoriteLanguages?: string,
  fallback?: string,
): string {
  const names = (language: { code: string; name: string }) => [
    language.code,
    language.name,
  ];
  return (
    rankFavorites(whisperLanguages, names, favoriteLanguages).favorites[0]
      ?.code ??
    rankFavorites(whisperLanguages, names, fallback).favorites[0]?.code ??
    "auto"
  );
}

export function whisperLanguageName(code: string): string {
  if (code === "auto") return "Detect Automatically";
  return (
    whisperLanguages.find((language) => language.code === code)?.name || code
  );
}

export function safeName(value: string): string {
  return (
    value
      .normalize("NFC")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f/\\:<>|?*]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\.+/, "")
      .slice(0, 100) || "video"
  );
}

export function languageLabel(code: string): string {
  const original = /(?:[-_]|\s|\()(?:orig|original)\)?$/i.test(code);
  const base = code.replace(/(?:[-_]|\s|\()(?:orig|original)\)?$/i, "");
  try {
    const label =
      new Intl.DisplayNames(["en"], { type: "language" }).of(base) || base;
    return original ? `${label} (Original)` : label;
  } catch {
    return code;
  }
}

export function normalizeLanguage(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/(?:\s*\((?:orig|original)\)|[-_](?:orig|original))\s*$/i, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

export function favoriteLanguageTerms(value?: string): string[] {
  return (value || "")
    .split(/[,;\n]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

/** Fuzzy score from 0 to 100 for how well a typed language matches any of a language's names. */
export function languageScore(names: string[], term: string): number {
  const query = normalizeLanguage(term);
  if (!query) return 0;
  const candidates = names.map(normalizeLanguage);
  let score = 0;
  for (const candidate of candidates) {
    if (candidate === query) score = Math.max(score, 100);
    else if (candidate.startsWith(query) && query.length >= 3)
      score = Math.max(score, 80);
    else if (candidate.includes(query) && query.length >= 4)
      score = Math.max(score, 60);
    else {
      let offset = 0;
      let first = -1;
      let last = -1;
      for (const character of query) {
        const position = candidate.indexOf(character, offset);
        if (position < 0) {
          last = -1;
          break;
        }
        if (first < 0) first = position;
        last = position;
        offset = position + 1;
      }
      if (last >= 0 && query.length >= 4) {
        const gaps = last - first + 1 - query.length;
        score = Math.max(
          score,
          Math.max(1, 40 - gaps * 3 - first + (first === 0 ? 8 : 0)),
        );
      }
    }
  }
  return score;
}

export function favoriteScore(caption: Caption, term: string): number {
  return languageScore(
    [caption.language, languageLabel(caption.language)],
    term,
  );
}

/**
 * Items matching the favorite languages, in the order the favorites were
 * written and best match first. When nothing matches well, up to five close
 * matches are returned as suggestions instead. Ties keep the items' order.
 */
export function rankFavorites<T>(
  items: T[],
  names: (item: T) => string[],
  favoriteLanguages?: string,
): { favorites: T[]; suggestions: T[] } {
  const terms = favoriteLanguageTerms(favoriteLanguages);
  const ranked = items.map((item) => {
    let score = 0;
    let term = terms.length;
    terms.forEach((value, index) => {
      const match = languageScore(names(item), value);
      if (match > score) {
        score = match;
        term = index;
      }
    });
    return { item, score, term };
  });
  const favorites = ranked
    .filter((entry) => entry.score >= 60)
    .sort((a, b) => a.term - b.term || b.score - a.score)
    .map((entry) => entry.item);
  const suggestions = favorites.length
    ? []
    : ranked
        .filter((entry) => entry.score >= 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((entry) => entry.item);
  return { favorites, suggestions };
}

export function parseVideo(data: unknown, url: string): Video {
  if (!data || typeof data !== "object")
    throw new Error("yt-dlp did not return video details.");
  const info = data as Record<string, unknown>;
  if (typeof info.id !== "string" || typeof info.title !== "string")
    throw new Error("yt-dlp did not return a video title and ID.");
  const captions: Caption[] = [];
  for (const [field, kind] of [
    ["subtitles", "manual"],
    ["automatic_captions", "automatic"],
  ] as const) {
    const group = info[field];
    if (!group || typeof group !== "object") continue;
    for (const [language, entries] of Object.entries(group)) {
      if (
        language === "live_chat" ||
        !Array.isArray(entries) ||
        entries.length === 0
      )
        continue;
      const formats = [
        ...new Set(
          entries
            .map((entry) =>
              entry && typeof entry === "object" && "ext" in entry
                ? String(entry.ext)
                : "",
            )
            .filter(Boolean),
        ),
      ];
      if (formats.length) captions.push({ language, kind, formats });
    }
  }
  captions.sort(
    (a, b) =>
      a.language.localeCompare(b.language) || a.kind.localeCompare(b.kind),
  );
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;
  const entries = Array.isArray(info.entries)
    ? (info.entries as unknown[]).filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object",
      )
    : [];
  // With --ignore-no-formats-error, photos in an Instagram post come back as
  // entries without formats or a duration, with the photo as thumbnails.
  const isPhoto = (entry: Record<string, unknown>) =>
    Array.isArray(entry.formats) &&
    entry.formats.length === 0 &&
    !entry.url &&
    typeof entry.duration !== "number";
  const videos = entries.length
    ? entries.filter((entry) => !isPhoto(entry))
    : isPhoto(info)
      ? []
      : [info];
  const images = (entries.length ? entries : [info])
    .filter(isPhoto)
    .map((entry): PostImage | undefined => {
      const best = (Array.isArray(entry.thumbnails) ? entry.thumbnails : [])
        .filter(
          (thumbnail): thumbnail is Record<string, unknown> =>
            Boolean(thumbnail) &&
            typeof thumbnail === "object" &&
            /^https:\/\//.test(String(thumbnail.url)),
        )
        .at(-1);
      return best
        ? {
            url: String(best.url),
            width: typeof best.width === "number" ? best.width : undefined,
            height: typeof best.height === "number" ? best.height : undefined,
          }
        : undefined;
    })
    .filter((image): image is PostImage => Boolean(image));
  const noVideo = !videos.length && images.length > 0;
  const thumbnail = text(info.thumbnail) ?? text(entries[0]?.thumbnail);
  const uploadDate = text(info.upload_date);
  return {
    id: info.id,
    title: noVideo ? info.title.replace(/^Video by /, "Post by ") : info.title,
    url,
    captions,
    thumbnail:
      thumbnail && /^https?:\/\//i.test(thumbnail) ? thumbnail : undefined,
    channel: text(info.channel) || text(info.uploader),
    duration:
      typeof info.duration === "number" && info.duration >= 0
        ? info.duration
        : undefined,
    uploadDate:
      uploadDate && /^\d{8}$/.test(uploadDate)
        ? `${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6)}`
        : undefined,
    items: videos.length > 1 ? videos.length : undefined,
    isLive: info.is_live === true || info.live_status === "is_live",
    images: images.length ? images : undefined,
    photos: images.length || undefined,
    noVideo: noVideo || undefined,
  };
}

/** The ID of an X post link, such as `x.com/nasa/status/123`. */
export function xStatusId(input: string): string | undefined {
  if (videoSite(input) !== "X") return undefined;
  return /\/status(?:es)?\/(\d+)/.exec(parseLink(input)?.pathname ?? "")?.[1];
}

/**
 * Reads an X post from the embed data X serves without an account. yt-dlp
 * skips photos, so they are found here, at their original size.
 */
export function parseXPost(data: unknown, url: string): Video | undefined {
  if (!data || typeof data !== "object") return undefined;
  const post = data as {
    id_str?: unknown;
    text?: unknown;
    created_at?: unknown;
    user?: { name?: unknown; screen_name?: unknown };
    mediaDetails?: {
      type?: unknown;
      media_url_https?: unknown;
      original_info?: { width?: unknown; height?: unknown };
    }[];
  };
  if (typeof post.id_str !== "string") return undefined;
  const images = (Array.isArray(post.mediaDetails) ? post.mediaDetails : [])
    .filter(
      (media) =>
        media?.type === "photo" &&
        typeof media.media_url_https === "string" &&
        media.media_url_https.startsWith("https://"),
    )
    .map((media) => ({
      url: `${media.media_url_https}?name=orig`,
      width:
        typeof media.original_info?.width === "number"
          ? media.original_info.width
          : undefined,
      height:
        typeof media.original_info?.height === "number"
          ? media.original_info.height
          : undefined,
    }));
  const name =
    typeof post.user?.name === "string" ? post.user.name.trim() : undefined;
  const text =
    typeof post.text === "string"
      ? post.text
          .replace(/https?:\/\/t\.co\/\w+/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : "";
  const short = text.length > 72 ? `${text.slice(0, 71).trimEnd()}…` : text;
  const created =
    typeof post.created_at === "string" ? new Date(post.created_at) : undefined;
  return {
    id: post.id_str,
    title: [name, short].filter(Boolean).join(" - ") || `Post ${post.id_str}`,
    url,
    captions: [],
    thumbnail: images[0] && images[0].url.replace(/name=orig$/, "name=small"),
    channel:
      typeof post.user?.screen_name === "string"
        ? `@${post.user.screen_name}`
        : undefined,
    uploadDate:
      created && !Number.isNaN(created.getTime())
        ? created.toISOString().slice(0, 10)
        : undefined,
    images: images.length ? images : undefined,
    photos: images.length || undefined,
    noVideo: images.length ? true : undefined,
  };
}

async function fetchXPost(id: string, signal?: AbortSignal): Promise<unknown> {
  // The token the embed widget sends, derived from the post ID.
  const token = ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, "");
  const response = await fetch(
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}&lang=en`,
    { signal },
  );
  if (!response.ok) throw new Error(`X returned HTTP ${response.status}`);
  return await response.json();
}

export function youtubeThumbnail(input: string): string | undefined {
  return isYoutubeUrl(input)
    ? `https://i.ytimg.com/vi/${youtubeId(input)}/mqdefault.jpg`
    : undefined;
}

/** Fetches the title and channel quickly from YouTube oEmbed while yt-dlp inspects the video. */
export async function fetchPreview(
  input: string,
  signal?: AbortSignal,
): Promise<VideoPreview> {
  if (!isYoutubeUrl(input)) return {};
  const response = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeUrl(input))}`,
    { signal },
  );
  if (!response.ok) return {};
  const data = (await response.json()) as Record<string, unknown>;
  return {
    title: typeof data.title === "string" ? data.title : undefined,
    channel:
      typeof data.author_name === "string" ? data.author_name : undefined,
  };
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60];
  const rest = String(total % 60).padStart(2, "0");
  return parts[0]
    ? `${parts[0]}:${String(parts[1]).padStart(2, "0")}:${rest}`
    : `${parts[1]}:${rest}`;
}

export async function executable(
  configured: string | undefined,
  name: string,
): Promise<string> {
  const candidates = configured
    ? [configured]
    : [
        ...(process.env.PATH || "")
          .split(":")
          .filter(Boolean)
          .map((dir) => join(dir, name)),
        join("/opt/homebrew/bin", name),
        join("/usr/local/bin", name),
        ...(name === "whisper-cli"
          ? [join(homedir(), "GitHub", "whisper.cpp", "build", "bin", name)]
          : []),
      ];
  for (const path of candidates) {
    try {
      await access(path, constants.X_OK);
      return path;
    } catch {
      /* try next path */
    }
  }
  throw new Error(
    `${name} was not found. Install it in Manage Tools and Models, or set its path in extension preferences.`,
  );
}

export function canceledError(): Error {
  return Object.assign(new Error("Canceled"), { name: "AbortError" });
}

export function isCanceled(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Runs a program and returns its output. `onProgress` receives every line it
 * prints, from both stdout and stderr. Aborting `signal` stops the program and
 * rejects with an AbortError.
 */
export async function run(
  bin: string,
  args: string[],
  onProgress?: (line: string) => void,
  signal?: AbortSignal,
  env?: NodeJS.ProcessEnv,
): Promise<string> {
  return await new Promise((done, fail) => {
    const child = spawn(bin, args, {
      shell: false,
      windowsHide: true,
      signal,
      env: env ?? process.env,
    });
    let stdout = "";
    let stderr = "";
    const lines = (onLine: (line: string) => void) => {
      let partial = "";
      return (chunk: string) => {
        const parts = (partial + chunk).split(/[\r\n]+/);
        partial = parts.pop() ?? "";
        parts.filter(Boolean).forEach(onLine);
      };
    };
    const progressOut = onProgress && lines(onProgress);
    const progressErr = onProgress && lines(onProgress);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > 20_000_000) child.kill();
      progressOut?.(chunk);
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-12_000);
      progressErr?.(chunk);
    });
    child.on("error", (error) =>
      fail(signal?.aborted ? canceledError() : error),
    );
    child.on("close", (code) =>
      signal?.aborted
        ? fail(canceledError())
        : code === 0
          ? done(stdout)
          : fail(
              new Error(
                `${basename(bin)} failed${code === null ? "" : ` (${code})`}: ${stderr.trim() || "No details available"}`,
              ),
            ),
    );
  });
}

export const cookieBrowsers: { value: string; title: string }[] = [
  { value: "safari", title: "Safari" },
  { value: "firefox", title: "Firefox" },
];

function cookieBrowser(settings: Settings) {
  return cookieBrowsers.find(
    (browser) => browser.value === settings.browserCookies,
  );
}

/**
 * Options passed to every yt-dlp run. yt-dlp is given ffmpeg's path because
 * Raycast's PATH usually doesn't include Homebrew, and subtitle conversion
 * fails without it.
 */
export async function ytDlpOptions(settings: Settings): Promise<string[]> {
  const options = ["--ignore-config", "--no-warnings"];
  try {
    options.push(
      "--ffmpeg-location",
      await executable(settings.ffmpegPath, "ffmpeg"),
    );
  } catch {
    /* yt-dlp reports a missing ffmpeg when a conversion needs it */
  }
  const browser = cookieBrowser(settings);
  if (browser) options.push("--cookies-from-browser", browser.value);
  return options;
}

/** Replaces yt-dlp errors about sign-in and browser cookies with what to do about them. */
export function explainYtDlpError(error: unknown, settings: Settings): unknown {
  if (!(error instanceof Error) || isCanceled(error)) return error;
  const browser = cookieBrowser(settings);
  const signIn = browser
    ? ` Make sure you're signed in to YouTube in ${browser.title} with an account that can watch it.`
    : " To use your YouTube account, choose Firefox or Safari under Browser Sign-In in extension preferences.";
  const message = error.message;
  if (browser && /could not find .*(cookies database|profile)/i.test(message))
    return new Error(
      `yt-dlp couldn't find ${browser.title}'s cookies. Sign in to YouTube in ${browser.title}, or choose Firefox or Safari under Browser Sign-In in extension preferences.`,
    );
  if (browser && /Operation not permitted|PermissionError/i.test(message))
    return new Error(
      `Raycast isn't allowed to read ${browser.title}'s cookies. Give Raycast Full Disk Access in System Settings → Privacy & Security, or choose another browser under Browser Sign-In.`,
    );
  if (browser && /decrypt|keychain|Safe Storage/i.test(message))
    return new Error(
      `yt-dlp couldn't read ${browser.title}'s cookies. Sign in again in ${browser.title}, or choose Firefox or Safari under Browser Sign-In in extension preferences.`,
    );
  if (
    /Sign in to confirm your age|age.restricted|inappropriate for some users/i.test(
      message,
    )
  )
    return new Error(`This video is age-restricted.${signIn}`);
  if (/members.only|Join this channel/i.test(message))
    return new Error(`This video is only for channel members.${signIn}`);
  if (/Private video/i.test(message))
    return new Error(`This video is private.${signIn}`);
  if (/confirm you.?re not a bot/i.test(message))
    return new Error(
      `YouTube asked to confirm you're not a bot.${signIn} Updating yt-dlp can also help.`,
    );
  if (/Unsupported URL/i.test(message))
    return new Error(
      "There's no video yt-dlp can download at this link. Check that it opens a video, or see yt-dlp's supported sites.",
    );
  const site = siteName(message);
  const signInTo = browser
    ? ` Make sure you're signed in to ${site} in ${browser.title}.`
    : ` To use your ${site} account, choose Firefox or Safari under Browser Sign-In in extension preferences.`;
  if (
    /no video (could be found|in this (post|tweet))|No video formats found|is not a video/i.test(
      message,
    )
  )
    return new Error("This post has no video.");
  if (/Bad guest token|guest token|rate.?limit/i.test(message))
    return new Error(
      `${site} is limiting downloads without an account. Try again in a moment.${browser ? "" : signInTo}`,
    );
  if (
    /--cookies|logged.in|log ?in|login required|requires authentication|not authorized|empty media response/i.test(
      message,
    )
  )
    return new Error(
      `${site} only shows this to signed-in accounts.${signInTo}`,
    );
  return error;
}

/** The site named in a yt-dlp error such as `ERROR: [Instagram] abc: …`. */
function siteName(message: string): string {
  const extractor = /\[([\w]+)(?::[\w:]+)?\]/.exec(message)?.[1] ?? "";
  const names: Record<string, string> = {
    twitter: "X",
    instagram: "Instagram",
    tiktok: "TikTok",
    facebook: "Facebook",
    vimeo: "Vimeo",
    reddit: "Reddit",
    twitch: "Twitch",
    bilibili: "Bilibili",
    threads: "Threads",
    youtube: "YouTube",
  };
  return (
    names[extractor.toLowerCase().replace(/(vod|clips?|post)$/, "")] ??
    (extractor && extractor.toLowerCase() !== "generic"
      ? extractor
      : "This site")
  );
}

/** Runs yt-dlp with the shared options, explaining sign-in and cookie errors. */
export async function runYtDlp(
  settings: Settings,
  args: string[],
  onProgress?: (line: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const bin = await executable(settings.ytDlpPath, "yt-dlp");
  try {
    return await run(
      bin,
      [...(await ytDlpOptions(settings)), ...args],
      onProgress,
      signal,
    );
  } catch (error) {
    throw explainYtDlpError(error, settings);
  }
}

/** Reads video details with yt-dlp; YouTube links are normalized to a single watch URL. */
export async function inspectMedia(
  urlInput: string,
  settings: Settings,
  signal?: AbortSignal,
): Promise<Video> {
  const url = mediaUrl(urlInput);
  const statusId = xStatusId(url);
  const xPost = statusId
    ? fetchXPost(statusId, signal).then(
        (data) => parseXPost(data, url),
        () => undefined,
      )
    : undefined;
  let video: Video;
  try {
    const output = await runYtDlp(
      settings,
      [
        "--dump-single-json",
        "--skip-download",
        "--no-playlist",
        // Instagram posts with only photos are read instead of failing.
        ...(videoSite(url) === "Instagram"
          ? ["--ignore-no-formats-error"]
          : []),
        url,
      ],
      undefined,
      signal,
    );
    video = parseVideo(JSON.parse(output), url);
  } catch (error) {
    const post = await xPost;
    if (
      post?.images &&
      error instanceof Error &&
      error.message === "This post has no video."
    )
      return post;
    throw error;
  }
  const post = await xPost;
  return post?.images
    ? { ...video, images: post.images, photos: post.photos }
    : video;
}

function imageExtension(type: string | null, url: string): string {
  const fromType = /^image\/(jpe?g|png|webp|gif|heic|avif)/i.exec(type ?? "");
  if (fromType) return fromType[1].toLowerCase().replace("jpeg", "jpg");
  const fromUrl = /\.(jpe?g|png|webp|gif|heic|avif)(?:$|[?#])/i.exec(url);
  return fromUrl ? fromUrl[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

/**
 * Downloads the photos in a post at full size. The post is read again, since
 * photo links from Instagram expire.
 */
export async function downloadImages(
  video: VideoRef,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<string[]> {
  onProgress?.("Finding photos…");
  const { images = [] } = await inspectMedia(video.url, settings, signal);
  if (!images.length) throw new Error("This post has no photos.");
  const destination = await outputDirectory(settings);
  const stem = `${safeName(video.title)} [${video.id}]`;
  const targets: string[] = [];
  for (const [index, image] of images.entries()) {
    onProgress?.(
      images.length > 1
        ? `Downloading photo ${index + 1} of ${images.length}… ${Math.floor((index / images.length) * 100)}%`
        : "Downloading photo…",
    );
    const response = await fetch(image.url, { signal });
    if (!response.ok)
      throw new Error(
        `Photo ${index + 1} couldn't be downloaded (HTTP ${response.status}).`,
      );
    const data = Buffer.from(await response.arrayBuffer());
    const target = await uniquePath(
      destination,
      images.length > 1 ? `${stem} ${index + 1}` : stem,
      imageExtension(response.headers.get("content-type"), image.url),
    );
    await writeFile(target, data, { flag: "wx" });
    targets.push(target);
  }
  return targets;
}

function cueTexts(input: string): string[] {
  const lines = input.replace(/\r/g, "").split("\n");
  const timing = /^\d\d:\d\d(?::\d\d)?[.,]\d+\s*-->/;
  const cues: string[] = [];
  let current: string[] | undefined;
  const flush = () => {
    if (current?.length) cues.push(current.join(" "));
    current = undefined;
  };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (timing.test(line)) {
      flush();
      current = [];
      continue;
    }
    if (!current || !line) continue;
    let next = index + 1;
    while (next < lines.length && !lines[next].trim()) next++;
    if (
      /^\d+$/.test(line) &&
      next < lines.length &&
      timing.test(lines[next].trim())
    )
      continue; // SRT cue number
    current.push(line);
  }
  flush();
  return cues;
}

function readableCue(cue: string): string {
  return cue
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function rawCaptionText(input: string, sourceFormat: string): string {
  if (sourceFormat === "json3") {
    const data = JSON.parse(input) as {
      events?: { segs?: { utf8?: string }[] }[];
    };
    const lines = (data.events || [])
      .map((event) =>
        (event.segs || [])
          .map((segment) => segment.utf8 || "")
          .join("")
          .trim(),
      )
      .filter(Boolean);
    return lines.join("\n") + (lines.length ? "\n" : "");
  }
  const lines = cueTexts(input).map(readableCue).filter(Boolean);
  return lines.join("\n") + (lines.length ? "\n" : "");
}

export function vttToText(input: string): string {
  const result: string[] = [];
  let previous: string[] = [];
  for (const cue of cueTexts(input)) {
    const text = readableCue(cue);
    if (!text) continue;
    const words = text.split(" ");
    let overlap = 0;
    for (let size = Math.min(previous.length, words.length); size > 0; size--) {
      if (
        previous.slice(-size).join(" ").toLocaleLowerCase() ===
        words.slice(0, size).join(" ").toLocaleLowerCase()
      ) {
        overlap = size;
        break;
      }
    }
    if (overlap === 1 && previous.length > 1 && words[0].length < 4)
      overlap = 0;
    const addition = words.slice(overlap).join(" ");
    if (addition) result.push(addition);
    previous = words;
  }
  return result.join("\n") + (result.length ? "\n" : "");
}

export function cleanSrt(input: string): string {
  const lines = input.replace(/\r/g, "").split("\n");
  const timing = /^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/;
  const cues: { start: string; end: string; text: string[] }[] = [];
  let current: { start: string; end: string; text: string[] } | undefined;
  const flush = () => {
    if (current?.text.length) cues.push(current);
  };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    const match = timing.exec(line);
    if (match) {
      flush();
      current = { start: match[1], end: match[2], text: [] };
      continue;
    }
    if (!current || !line) continue;
    if (/^\d+$/.test(line) && timing.test(lines[index + 1]?.trim() || ""))
      continue;
    current.text.push(line);
  }
  flush();
  return (
    cues
      .map(
        (cue, index) =>
          `${index + 1}\n${cue.start} --> ${cue.end}\n${cue.text.join("\n")}`,
      )
      .join("\n\n") + (cues.length ? "\n" : "")
  );
}

export async function outputDirectory(settings: Settings): Promise<string> {
  const dir = resolve(
    (settings.downloadDirectory || join(homedir(), "Downloads")).replace(
      /^~(?=\/|$)/,
      homedir(),
    ),
  );
  if (!(await stat(dir)).isDirectory())
    throw new Error(
      "The download folder does not exist. Choose another folder in extension preferences.",
    );
  await access(dir, constants.W_OK);
  return dir;
}

export async function uniquePath(
  directory: string,
  stem: string,
  extension: string,
): Promise<string> {
  return `${await uniqueBase(directory, stem, [extension])}.${extension}`;
}

export async function uniqueBase(
  directory: string,
  stem: string,
  extensions: string[],
): Promise<string> {
  for (let index = 0; index < 1000; index++) {
    const base = join(directory, `${stem}${index ? ` (${index + 1})` : ""}`);
    const exists = await Promise.all(
      extensions.map(async (extension) => {
        try {
          await access(`${base}.${extension}`);
          return true;
        } catch {
          return false;
        }
      }),
    );
    if (exists.every((value) => !value)) return base;
  }
  throw new Error("Too many files with the same name in the download folder.");
}

/** A downloaded caption's file name without extension, for example `Title [id] - sr - auto`. */
export function captionStem(
  video: Pick<Video, "id" | "title">,
  caption: Pick<Caption, "language" | "kind">,
  format: ExportFormat,
): string {
  return `${safeName(video.title)} [${video.id}] - ${safeName(caption.language)}${caption.kind === "automatic" ? " - auto" : ""}${format === "raw" ? " - RAW" : ""}`;
}

export function captionExtension(format: ExportFormat): string {
  return format === "raw" ? "txt" : format;
}

export async function downloadCaption(
  video: Video,
  caption: Caption,
  format: ExportFormat,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
  directory?: string,
): Promise<string> {
  const destination = directory ?? (await outputDirectory(settings));
  const temporary = await mkdtemp(join(tmpdir(), "raycast-captions-"));
  try {
    // YouTube's JSON3 has spoken segments, while VTT repeats scrolling lines.
    const preferred =
      format === "raw" &&
      caption.kind === "automatic" &&
      caption.formats.includes("json3")
        ? "json3"
        : format === "raw"
          ? caption.formats.includes("vtt")
            ? "vtt"
            : caption.formats.includes("srt")
              ? "srt"
              : caption.formats.includes("json3")
                ? "json3"
                : caption.formats[0]
          : format === "srt" && caption.formats.includes("srt")
            ? "srt"
            : caption.formats.includes("vtt")
              ? "vtt"
              : caption.formats.includes("srt")
                ? "srt"
                : caption.formats[0];
    const langPattern = `^${caption.language.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
    const args = [
      "--no-playlist",
      "--skip-download",
      "--sub-langs",
      langPattern,
      "--sub-format",
      preferred,
      "-o",
      join(temporary, "caption.%(ext)s"),
      caption.kind === "manual" ? "--write-subs" : "--write-auto-subs",
    ];
    if ((format === "srt" || format === "vtt") && preferred !== format)
      args.push("--convert-subs", format);
    if (format === "txt" && preferred !== "vtt")
      args.push("--convert-subs", "vtt");
    args.push(video.url);
    try {
      await runYtDlp(settings, args, undefined, signal);
    } catch (error) {
      if (
        caption.kind !== "automatic" ||
        !(error instanceof Error) ||
        !error.message.includes("HTTP Error 429")
      )
        throw error;
      onProgress?.(
        "YouTube rate limited this caption. Retrying after 60 seconds…",
      );
      await runYtDlp(
        settings,
        [...args.slice(0, -1), "--sleep-subtitles", "60", video.url],
        undefined,
        signal,
      );
    }
    const files = (await readdir(temporary)).filter(
      (file) => !file.endsWith(".part"),
    );
    const extension =
      format === "raw" ? preferred : format === "txt" ? "vtt" : format;
    const source = files.find((file) => file.endsWith(`.${extension}`));
    if (!source)
      throw new Error(
        `yt-dlp did not produce a ${extension.toUpperCase()} file for ${caption.language}.`,
      );
    const stem = captionStem(video, caption, format);
    const target = await uniquePath(
      destination,
      stem,
      format === "raw" ? "txt" : format,
    );
    if (format === "raw")
      await writeFile(
        target,
        rawCaptionText(
          await readFile(join(temporary, source), "utf8"),
          extension,
        ),
        { encoding: "utf8", flag: "wx" },
      );
    else if (format === "txt")
      await writeFile(
        target,
        vttToText(await readFile(join(temporary, source), "utf8")),
        { encoding: "utf8", flag: "wx" },
      );
    else if (format === "srt")
      await writeFile(
        target,
        cleanSrt(await readFile(join(temporary, source), "utf8")),
        { encoding: "utf8", flag: "wx" },
      );
    else
      await copyFile(join(temporary, source), target, constants.COPYFILE_EXCL);
    return target;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

/** A short status for a line yt-dlp prints while downloading media. */
export function mediaProgress(
  line: string,
  format: MediaFormat,
): string | undefined {
  const name = format.toUpperCase();
  const item = /^\[download\] Downloading item (\d+) of (\d+)/.exec(line);
  if (item) return `Downloading ${item[1]} of ${item[2]}…`;
  const percent = /^\[download\]\s+([\d.]+)%/.exec(line);
  if (percent) return `Downloading ${name}… ${Math.floor(Number(percent[1]))}%`;
  if (/^\[Merger\]/.test(line)) return "Merging audio and video…";
  if (/^\[(ExtractAudio|VideoConvertor)\]/.test(line))
    return `Converting to ${name}…`;
  return undefined;
}

/**
 * Downloads a video's audio or video and returns the saved files: one file,
 * or one per video for posts with several, such as X posts and Instagram
 * carousels. Files are saved in the download folder unless `directory` is set.
 */
export async function downloadMedia(
  video: VideoRef,
  format: MediaFormat,
  settings: Settings,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
  directory?: string,
): Promise<string[]> {
  if (video.isLive)
    throw new Error(
      "This is a live stream. It can be downloaded after the stream ends.",
    );
  // MP3, M4A and MP4 all need ffmpeg; fail early with a clear message.
  await executable(settings.ffmpegPath, "ffmpeg");
  const destination = directory ?? (await outputDirectory(settings));
  const temporary = await mkdtemp(join(tmpdir(), "raycast-media-"));
  try {
    const output = join(temporary, "%(playlist_index|0)s-%(id)s.%(ext)s");
    const args = ["--no-playlist", "--newline", "-o", output];
    if (format === "mp4") {
      args.push(
        "-f",
        "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
        "--merge-output-format",
        "mp4",
        "--recode-video",
        "mp4",
      );
    } else {
      args.push(
        "-f",
        "bestaudio/best",
        "--extract-audio",
        "--audio-format",
        format,
      );
      if (format === "mp3") args.push("--audio-quality", "0");
    }
    // A photo in a carousel shouldn't stop the videos around it.
    if (video.items || video.photos) args.push("--ignore-errors");
    args.push(video.url);
    onProgress?.(`Downloading ${format.toUpperCase()}…`);
    let item = "";
    let failure: unknown;
    try {
      await runYtDlp(
        settings,
        args,
        (line) => {
          const message = mediaProgress(line, format);
          if (!message) return;
          if (/^Downloading \d+ of \d+…$/.test(message))
            item = `${message.slice(12, -1)} · `;
          onProgress?.(
            /^Downloading \d+ of/.test(message) ? message : `${item}${message}`,
          );
        },
        signal,
      );
    } catch (error) {
      if (isCanceled(error)) throw error;
      failure = error;
    }
    const files = (await readdir(temporary))
      .filter((name) => name.endsWith(`.${format}`))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!files.length) {
      if (
        format !== "mp4" &&
        failure instanceof Error &&
        /audio codec|Requested format is not available/i.test(failure.message)
      )
        throw new Error("This video has no audio.");
      throw (
        failure ??
        new Error(`yt-dlp did not produce a ${format.toUpperCase()} file.`)
      );
    }
    const stem = `${safeName(video.title)} [${video.id}]`;
    const targets: string[] = [];
    for (const [index, file] of files.entries()) {
      const target = await uniquePath(
        destination,
        files.length > 1 ? `${stem} ${index + 1}` : stem,
        format,
      );
      await copyFile(join(temporary, file), target, constants.COPYFILE_EXCL);
      targets.push(target);
    }
    return targets;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
