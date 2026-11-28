import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import { Video } from "../types.js";
import { withAudioLanguage } from "./audio-language.js";
import { Clip, clipSuffix, sectionArg } from "./clip.js";
import { PROGRESS_TEMPLATE, YtdlpEvent, parseYtdlpLine } from "./progress.js";
import { SubtitlePick, isSubtitleFile, subtitleArgs } from "./subtitles.js";
import {
  AbortError,
  DEFAULT_IDLE_MS,
  KILL_GRACE_MS,
  MAX_TIMER_MS,
  RunResult,
  killProcessTree,
  runWithWatchdog,
} from "./run.js";

/**
 * Pull the first JSON object out of yt-dlp's stdout. yt-dlp can emit `[debug]`
 * or `[warning]` lines on stdout before the JSON when its config has tracing
 * on, so a naive `JSON.parse(stdout)` would throw a SyntaxError and the form
 * silently treats the URL as unknown. Scan for the first line that starts with
 * `{` and parse from there.
 */
export function extractDumpJson<T = Video>(stdout: string): T {
  const lines = stdout.split("\n");
  const jsonStart = lines.findIndex((line) => line.trimStart().startsWith("{"));
  if (jsonStart === -1) {
    throw new Error("yt-dlp produced no JSON metadata. Try updating yt-dlp via the Update Libraries action.");
  }
  // `--dump-json` prints one object per line. A playlist prints one per entry:
  // the first is the one the form describes.
  try {
    return JSON.parse(lines[jsonStart]) as T;
  } catch {
    // Not a single line (a wrapped or pretty-printed dump): parse to the end.
    return JSON.parse(lines.slice(jsonStart).join("\n")) as T;
  }
}

/**
 * The `-o` template for a download into `folder`. A `%` in the folder's own
 * name is doubled so yt-dlp doesn't read it as a field (`100% Legal`), and the
 * title is cut to 180 bytes: file names top out at 255 bytes, which a long
 * CJK or Cyrillic title plus `.f137.mp4.part` would pass.
 */
export function outputTemplateIn(folder: string, name = "%(title).180B (%(id)s).%(ext)s"): string {
  return path.join(folder.replace(/%/g, "%%"), name);
}

/**
 * The `-o` template for a download that isn't the plain whole video: the usual
 * name plus `suffix` (a clip's times, a dubbed soundtrack's language), so it
 * doesn't replace (or get skipped as) the video saved in the same folder.
 */
export function suffixedTemplateIn(folder: string, suffix: string): string {
  return outputTemplateIn(folder, `%(title).160B (%(id)s)${suffix.replace(/%/g, "%%")}.%(ext)s`);
}

/** The `-o` template for a clip (see `suffixedTemplateIn`). */
export function clipTemplateIn(folder: string, clip: Clip): string {
  return suffixedTemplateIn(folder, clipSuffix(clip));
}

/**
 * The `-o` template for a playlist: a folder named after it inside `folder`,
 * and its videos numbered in playlist order. yt-dlp cleans every field's value
 * for a file name, so a title can't add a path of its own.
 */
export function playlistTemplateIn(folder: string): string {
  return path.join(
    folder.replace(/%/g, "%%"),
    "%(playlist_title,playlist|Playlist).120B",
    "%(playlist_index)03d - %(title).170B (%(id)s).%(ext)s",
  );
}

type ProbeOptions = { signal?: AbortSignal; timeoutMs?: number; knownSitesOnly?: boolean; cookiesFromBrowser?: string };

/**
 * Run yt-dlp for a JSON answer and return its stdout. `opts.signal` cancels the
 * run (so a stale probe is killed when the URL changes or the form unmounts),
 * and `opts.timeoutMs` caps total runtime so a wedged extractor can't hang forever.
 */
async function runForJson(ytdlPath: string, args: string[], opts?: ProbeOptions): Promise<string> {
  if (opts?.signal?.aborted) throw new AbortError();
  // Cancel and time out by ending the whole process tree: execa's own
  // cancelSignal and timeout kill only yt-dlp itself, which leaves its deno
  // (and on Windows the Python behind the yt-dlp.exe launcher) running.
  const subprocess = execa(ytdlPath, args, {
    env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
    stdin: "ignore",
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  let timedOut = false;
  // SIGTERM first; whatever ignores it (a stalled deno) gets SIGKILL after a
  // grace period, as in runWithWatchdog, so the promise always settles.
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    killProcessTree(subprocess);
    killTimer ??= setTimeout(() => killProcessTree(subprocess, "SIGKILL"), KILL_GRACE_MS);
  };
  const timer =
    opts?.timeoutMs && opts.timeoutMs > 0
      ? setTimeout(
          () => {
            timedOut = true;
            stop();
          },
          Math.min(opts.timeoutMs, MAX_TIMER_MS),
        )
      : undefined;
  opts?.signal?.addEventListener("abort", stop, { once: true });
  try {
    return (await subprocess).stdout;
  } catch (error) {
    if (opts?.signal?.aborted) throw new AbortError();
    if (timedOut)
      throw new Error(`yt-dlp didn't answer within ${Math.max(1, Math.round((opts?.timeoutMs ?? 0) / 1000))}s.`);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    if (killTimer) clearTimeout(killTimer);
    opts?.signal?.removeEventListener("abort", stop);
  }
}

/**
 * Fetch yt-dlp metadata for a URL via --dump-json. `denoPath`, when given,
 * points yt-dlp at its JS runtime. See `runForJson` for `opts`.
 */
export async function fetchVideoInfo(
  ytdlPath: string,
  url: string,
  forceIpv4: boolean,
  denoPath?: string,
  opts?: ProbeOptions,
): Promise<Video> {
  const args = [
    forceIpv4 ? "--force-ipv4" : "",
    denoPath ? "--js-runtimes" : "",
    denoPath ? `deno:${denoPath}` : "",
    "--no-playlist",
    // A playlist or channel link would otherwise be read entry by entry before answering.
    "--playlist-items",
    "1",
    ...(opts?.knownSitesOnly ? KNOWN_SITES_ONLY : []),
    ...cookieArgs(opts?.cookiesFromBrowser),
    "--no-warnings",
    "--quiet",
    "--dump-json",
    url,
  ].filter(Boolean);
  return extractDumpJson(await runForJson(ytdlPath, args, opts));
}

/** One video of a playlist, as the Download form lists it. `index` is its 1-based place in the playlist. */
export type PlaylistEntry = { index: number; title: string; duration?: number };

export type PlaylistInfo = {
  title?: string;
  entries: PlaylistEntry[];
  /** True when the playlist has more videos than `PLAYLIST_PICK_LIMIT`; `entries` are its first ones. */
  truncated: boolean;
  /**
   * The lists inside the link, when it holds several instead of videos: a
   * channel's tabs (Videos, Live, Shorts). `entries` is empty then: yt-dlp's
   * `--playlist-items` would count places in every one of those lists at once,
   * so there are no single videos to pick.
   */
  lists?: string[];
};

/** Most videos the form lists to choose from. A channel can have thousands, each page of which is a request. */
export const PLAYLIST_PICK_LIMIT = 300;

/** True when the probed video is the first entry of a playlist or channel link, not a single video. */
export function isPlaylistProbe(video: Video | undefined): boolean {
  return video?.playlist_index != null;
}

/** yt-dlp arguments that list a playlist's videos without reading each one. */
export function buildPlaylistArgs(o: {
  url: string;
  forceIpv4?: boolean;
  denoPath?: string;
  cookiesFromBrowser?: string;
}): string[] {
  return [
    "--flat-playlist",
    // One more than is listed, to know whether there are more.
    "--playlist-end",
    String(PLAYLIST_PICK_LIMIT + 1),
    ...(o.forceIpv4 ? ["--force-ipv4"] : []),
    ...(o.denoPath ? ["--js-runtimes", `deno:${o.denoPath}`] : []),
    ...cookieArgs(o.cookiesFromBrowser),
    "--no-warnings",
    "--quiet",
    "--dump-single-json",
    o.url,
  ];
}

/** Read `--flat-playlist --dump-single-json` output. Entries keep their place in the playlist as `index`. */
export function parsePlaylist(json: unknown): PlaylistInfo {
  const list = json as { title?: unknown; entries?: unknown } | null;
  const all = Array.isArray(list?.entries) ? list.entries : [];
  const listTitle = typeof list?.title === "string" && list.title.trim() ? list.title.trim() : undefined;
  // A list inside the list: it carries its own entries, or (unexpanded) points at a channel tab.
  const nested = all.filter((entry) => {
    const e = entry as { entries?: unknown; ie_key?: unknown } | null;
    return Array.isArray(e?.entries) || (typeof e?.ie_key === "string" && /Tab$/.test(e.ie_key));
  });
  if (nested.length > 0) {
    const lists = nested.map((entry, i) => {
      const title = (entry as { title?: unknown }).title;
      return typeof title === "string" && title.trim() ? title.trim() : `List ${i + 1}`;
    });
    return { title: listTitle, entries: [], truncated: false, lists };
  }
  const entries = all.slice(0, PLAYLIST_PICK_LIMIT).map((entry, i): PlaylistEntry => {
    const e = (entry ?? {}) as { title?: unknown; duration?: unknown; id?: unknown };
    const title = typeof e.title === "string" && e.title.trim() ? e.title.trim() : undefined;
    return {
      index: i + 1,
      title: title ?? (typeof e.id === "string" ? e.id : `Video ${i + 1}`),
      duration: typeof e.duration === "number" && e.duration > 0 ? e.duration : undefined,
    };
  });
  return { title: listTitle, entries, truncated: all.length > PLAYLIST_PICK_LIMIT };
}

/** List the videos of a playlist or channel link (see `buildPlaylistArgs`). */
export async function fetchPlaylist(
  ytdlPath: string,
  url: string,
  forceIpv4: boolean,
  denoPath?: string,
  opts?: ProbeOptions,
): Promise<PlaylistInfo> {
  const args = buildPlaylistArgs({ url, forceIpv4, denoPath, cookiesFromBrowser: opts?.cookiesFromBrowser });
  return parsePlaylist(extractDumpJson<unknown>(await runForJson(ytdlPath, args, opts)));
}

const LIVE_STATUSES = new Set(["is_live", "is_upcoming", "post_live"]);

/**
 * True when yt-dlp metadata marks the URL as a stream that is live, upcoming,
 * or over but not yet processed into a video. A recording of a past stream
 * (`was_live`) is an ordinary video; an absent or `null` status means not live.
 */
export function isLiveStream(video: Video): boolean {
  return LIVE_STATUSES.has(video.live_status ?? "");
}

/** A download that yt-dlp skipped because the stream is live right now. */
export class LiveStreamError extends Error {
  constructor() {
    super("Live streams are not supported");
    this.name = "LiveStreamError";
  }
}

/**
 * yt-dlp's site extractors only, without the generic page reader: for links the
 * AI picked, so a page can't point yt-dlp at whatever it embeds or redirects to
 * (a router, cloud metadata).
 */
const KNOWN_SITES_ONLY = ["--use-extractors", "default,-generic"];

/** `--cookies-from-browser <spec>` for a resolved browser spec; nothing when none is set. */
function cookieArgs(spec: string | undefined): string[] {
  return spec ? ["--cookies-from-browser", spec] : [];
}

/** Files yt-dlp can embed a cover image into (`--embed-thumbnail` fails the download for any other). */
const THUMBNAIL_TARGETS = new Set(["mp3", "m4a", "opus", "flac", "mp4", "mkv", "mka", "ogg", "m4v", "mov"]);

export type VideoDownloadArgs = {
  url: string;
  format: string;
  outputTemplate: string;
  ffmpegPath: string;
  denoPath?: string;
  /** Idle-watchdog window in ms. Defaults to DEFAULT_IDLE_MS if omitted. */
  idleMs?: number;
  /** Aborting cancels the download mid-flight (used by the form's Stop action and unmount cleanup). */
  abortSignal?: AbortSignal;
  /** Leave out yt-dlp's generic page reader (see `KNOWN_SITES_ONLY`). */
  knownSitesOnly?: boolean;
  /** A browser spec whose logins yt-dlp uses (age-restricted, private or members-only videos). */
  cookiesFromBrowser?: string;
  /** Write the title, artist, date and chapters into the file, and the thumbnail as its cover where the format has one. */
  embedMetadata?: boolean;
  /** Cut sponsor segments out with SponsorBlock's community data (YouTube only; yt-dlp asks sponsor.ajay.app). */
  removeSponsors?: boolean;
  /** The Force IPv4 preference: the download must use it too, not only the metadata fetch. */
  forceIpv4?: boolean;
  /** Download only this part of the video. */
  clip?: Clip;
  /** A caption track to embed in the video or save next to it. */
  subtitles?: SubtitlePick;
  /** The soundtrack to take when the video has several (`de-DE`); the site's original when unset. */
  audioLanguage?: string;
  /**
   * The link is a playlist or channel and is downloaded as one: `items` are the
   * 1-based places of the videos to fetch, all of them when empty or missing.
   */
  playlist?: { items?: number[] };
};

/**
 * Sentinel prefix wrapped around the final filepath so it can be picked out of
 * yt-dlp's mixed stdout deterministically. Without the tag we relied on "first
 * char is `/`", which matched intermediate post-processor lines like
 * `[ExtractAudio] Destination: /…` and could overwrite the real after_move
 * path. The tag is opaque enough that no extractor's own output prints it.
 */
const FILEPATH_TAG = "THE-DOWNLOADER-FILEPATH:";
const FILEPATH_LINE_RE = new RegExp(`^${FILEPATH_TAG}(.+)$`);

/**
 * Build yt-dlp CLI args for a media download. `format` is a `"<download>#<target>"`
 * pair: when the download half is `bestaudio` the audio is extracted to the target
 * audio format, otherwise the video streams are downloaded and **remuxed** into the
 * target container with `--merge-output-format`.
 *
 * Remuxing copies the streams (fast, lossless). The old `--recode-video` forced a
 * full re-encode that ran ffmpeg silently for minutes, tripping the idle watchdog
 * mid-encode and leaving a half-written file behind. The format selector already
 * steers toward container-compatible codecs (see `videoFormatSelector`), so a copy
 * is all that's needed.
 *
 * `--no-playlist` keeps the download in lock-step with `fetchVideoInfo` (also
 * called with it): a `watch?v=…&list=…` URL downloads the single video whose
 * title and live-status the form inspected, not the whole playlist. A pure
 * playlist URL (no video reference) still downloads every entry — or, with
 * `playlist.items`, the entries picked in the form (`--playlist-items`).
 *
 * `--download-sections` fetches only `clip`. `--force-keyframes-at-cuts`
 * re-encodes around the cuts so the clip starts and ends on the asked second:
 * a plain stream copy can only cut at a keyframe, seconds early, and leaves a
 * frozen picture at the start in many players.
 *
 * `--match-filter !is_live` skips a stream that is live right now, whichever
 * command started the download: progress keeps arriving from a live stream, so
 * the idle watchdog would never stop it. yt-dlp then exits 0 with a "does not
 * pass filter" line, which `runVideoDownload` turns into a `LiveStreamError`
 * when nothing was downloaded (a playlist keeps its other entries).
 *
 * `--newline` makes yt-dlp terminate each progress update with a real newline.
 * On a pipe (non-TTY) it otherwise redraws progress with bare `\r`, which a
 * line-buffered reader would sit on until the download finished.
 *
 * `--progress-template` swaps the human progress line for raw byte counts,
 * speed and ETA (see `PROGRESS_TEMPLATE`), which the download view charts.
 * `--print` implies `--quiet`, which would also hide the `[info] … format(s)`,
 * `[download] Destination` and `[Merger]` lines the view uses to tell streams
 * and the merge step apart; `--no-quiet` (yt-dlp 2023.07+) brings them back.
 */
export function buildVideoDownloadArgs(a: VideoDownloadArgs): string[] {
  const args = [
    "-o",
    a.outputTemplate,
    "--ffmpeg-location",
    a.ffmpegPath,
    "--no-playlist",
    "--match-filter",
    "!is_live",
    ...(a.knownSitesOnly ? KNOWN_SITES_ONLY : []),
    ...cookieArgs(a.cookiesFromBrowser),
    ...(a.forceIpv4 ? ["--force-ipv4"] : []),
  ];
  if (a.denoPath) {
    args.push("--js-runtimes", `deno:${a.denoPath}`);
  }
  const [downloadFormat, target] = a.format.split("#");
  if (a.embedMetadata) {
    args.push("--embed-metadata");
    // WebM and WAV have no cover image; asking for one there fails the whole download.
    if (THUMBNAIL_TARGETS.has(target)) args.push("--embed-thumbnail");
  }
  // Not for a clip: SponsorBlock's times are the whole video's, and the clip's own clock starts at its cut.
  if (a.removeSponsors && !a.clip) args.push("--sponsorblock-remove", "sponsor");
  if (a.clip) args.push("--download-sections", sectionArg(a.clip), "--force-keyframes-at-cuts");
  if (a.playlist?.items?.length) {
    const items = [...new Set(a.playlist.items.filter((n) => Number.isInteger(n) && n > 0))].sort((x, y) => x - y);
    if (items.length > 0) args.push("--playlist-items", items.join(","));
  }
  if (downloadFormat === "bestaudio") {
    // Without an explicit selector yt-dlp would download its default best
    // video+audio and then strip the audio — many times the bytes needed.
    // `/best` covers sites that publish no audio-only stream.
    // A picked soundtrack has no `/best` behind it: that file would be in the site's default language.
    const selector = a.audioLanguage ? withAudioLanguage("bestaudio", a.audioLanguage) : "bestaudio/best";
    args.push("--format", selector, "--extract-audio", "--audio-format", target, "--audio-quality", "0");
  } else {
    // "webm/mkv": when the selector had to fall back to streams WebM can't hold
    // (e.g. H.264 + AAC), yt-dlp merges into mkv instead of failing the merge.
    const selector = a.audioLanguage ? withAudioLanguage(downloadFormat, a.audioLanguage) : downloadFormat;
    args.push("--format", selector, "--merge-output-format", target === "webm" ? "webm/mkv" : target);
    // Captions go with a whole video only: an extracted audio file has no place
    // for them, and a clip's would keep the whole video's timing.
    if (a.subtitles && !a.clip) args.push(...subtitleArgs(a.subtitles));
  }
  args.push(
    "--no-quiet",
    "--progress",
    "--newline",
    "--progress-template",
    PROGRESS_TEMPLATE,
    "--print",
    `after_move:${FILEPATH_TAG}%(filepath)s`,
    a.url,
  );
  return args;
}

export type VideoDownloadResult = {
  /** The file saved; for a playlist, the last one. Empty when yt-dlp didn't report it. */
  filePath: string;
  /** Every file saved, in order: one, or a playlist's videos. */
  files: string[];
  /** How many videos the playlist download set out to fetch, when yt-dlp said (not for a link with several lists). */
  total?: number;
  /** yt-dlp's error output when a playlist saved some videos and failed others. */
  failure?: string;
};

/** How much longer than a download ffmpeg's silent merge, conversion or cut may take. */
const POSTPROCESS_IDLE_SCALE = 10;

/** `[download] Destination: …` — the file yt-dlp is writing a stream to. */
const DESTINATION_RE = /^\[download\] Destination:\s*(.+)$/;
/** `[Merger] Merging formats into "…"` — the file the streams are being joined into. */
const MERGE_TARGET_RE = /^\[Merger\] Merging formats into "(.+)"$/;
/** A stream yt-dlp downloaded to merge or convert: `Title (id).f137.mp4`. Never the name of a finished file. */
const INTERMEDIATE_RE = /\.f[0-9A-Za-z_-]+\.[0-9A-Za-z]+$/;

/**
 * After Stop, remove what yt-dlp leaves of the streams it was writing: the
 * `.part` file, its `.ytdl` resume note and any `.part-Frag…` pieces — and,
 * when Stop came during the merge, the downloaded streams themselves
 * (`….f137.mp4`, which only exist to be merged) and the half-written
 * `….temp.mp4` of each `mergeTargets` file. Never a finished file.
 */
export function removePartialDownloads(destinations: string[], mergeTargets: string[] = []): void {
  for (const target of mergeTargets) {
    const ext = path.extname(target);
    try {
      fs.rmSync(`${target.slice(0, target.length - ext.length)}.temp${ext}`, { force: true });
    } catch {
      /* still locked or already gone */
    }
  }
  for (const destination of destinations) {
    const leftovers = [`${destination}.part`, `${destination}.ytdl`];
    if (INTERMEDIATE_RE.test(destination)) leftovers.push(destination);
    const fragmentPrefix = `${path.basename(destination)}.part-Frag`;
    try {
      for (const name of fs.readdirSync(path.dirname(destination))) {
        if (name.startsWith(fragmentPrefix)) leftovers.push(path.join(path.dirname(destination), name));
      }
    } catch {
      /* the folder is gone — nothing left to clean */
    }
    for (const leftover of leftovers) {
      try {
        fs.rmSync(leftover, { force: true });
      } catch {
        /* still locked or already gone */
      }
    }
  }
}

/**
 * Run yt-dlp for a media download. `onProgress` receives the download percentage
 * as yt-dlp reports it; `onEvent`, when given, receives every parsed progress,
 * stream and post-processing event (see `parseYtdlpLine`). Resolves with the
 * downloaded file path on a zero exit; rejects with the stderr text on a non-zero
 * exit, or with a watchdog error if yt-dlp stalls. Progress and the
 * `after_move:filepath` line are read from stdout.
 *
 * A playlist that saved some of its videos resolves too, with yt-dlp's errors
 * in `failure`: one private or deleted video is common, and the rest are there.
 */
export async function runVideoDownload(
  binaryPath: string,
  options: VideoDownloadArgs,
  onProgress: (percent: number) => void,
  onEvent?: (event: YtdlpEvent) => void,
): Promise<VideoDownloadResult> {
  let filePath = "";
  const files: string[] = [];
  let total: number | undefined;
  // A channel's tabs are lists of their own, each counted from 1: no one total then.
  let severalLists = false;
  let skippedLive = false;
  // A caption track is being written: its progress isn't the video's.
  let writingSubtitles = false;
  const destinations: string[] = [];
  const mergeTargets: string[] = [];
  // ffmpeg prints nothing while it merges, converts or cuts, which on a long
  // video takes longer than the idle window allows a download to be silent.
  let postProcessing = false;
  // Line-buffered (via onStdoutLine) so a tagged filepath split across two
  // stream chunks is still matched whole.
  const handleLine = (line: string) => {
    if (/does not pass filter \(!is_live\)/.test(line)) skippedLive = true;
    const destination = DESTINATION_RE.exec(line.trim());
    if (destination) {
      destinations.push(destination[1].trim());
      writingSubtitles = isSubtitleFile(destination[1].trim());
      // Not a stream of the video: the view would count it as one.
      if (writingSubtitles) return;
    }
    const mergeTarget = MERGE_TARGET_RE.exec(line.trim());
    if (mergeTarget) mergeTargets.push(mergeTarget[1]);
    const event = parseYtdlpLine(line);
    if (event) {
      if (writingSubtitles && event.type === "progress") return;
      if (event.type === "stream-skipped") writingSubtitles = false;
      if (event.type === "item") {
        if (event.index === 1 && total !== undefined) severalLists = true;
        total = event.total;
      }
      if (event.type === "postprocess") postProcessing = true;
      else if (event.type === "progress" || event.type === "stream-start") postProcessing = false;
      if (event.type === "progress" && event.progress.percent !== undefined) onProgress(event.progress.percent);
      onEvent?.(event);
      return;
    }
    const tagged = FILEPATH_LINE_RE.exec(line.trim());
    if (tagged) {
      filePath = tagged[1].trim();
      files.push(filePath);
    }
  };
  let result: RunResult;
  try {
    result = await runWithWatchdog(binaryPath, buildVideoDownloadArgs(options), {
      idleMs: options.idleMs ?? DEFAULT_IDLE_MS,
      // A clip is fetched and cut by ffmpeg in one go, without yt-dlp's progress
      // lines: the whole run gets the window a silent post-processing step has.
      idleScale: () => (postProcessing || options.clip ? POSTPROCESS_IDLE_SCALE : 1),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      onStdoutLine: handleLine,
      abortSignal: options.abortSignal,
    });
  } catch (error) {
    // The whole process tree has exited by now, so nothing holds the files open.
    if (error instanceof AbortError) removePartialDownloads(destinations, mergeTargets);
    throw error;
  }
  const { code, stderr } = result;
  if (code === 0 && skippedLive && !filePath) throw new LiveStreamError();
  if (severalLists) total = undefined;
  if (code === 0) return { filePath, files, total };
  const failure = stderr.trim() || `yt-dlp exited with code ${code}`;
  if (options.playlist && files.length > 0) return { filePath, files, total, failure };
  throw new Error(failure);
}

export type ThumbnailDownloadArgs = {
  url: string;
  outputTemplate: string;
  /** yt-dlp's JS runtime, when installed: YouTube's extractor wants one. */
  denoPath?: string;
  /** Idle-watchdog window in ms. Defaults to DEFAULT_IDLE_MS if omitted. */
  idleMs?: number;
  /** Aborting cancels the download mid-flight. */
  abortSignal?: AbortSignal;
  /** A browser spec whose logins yt-dlp uses. */
  cookiesFromBrowser?: string;
  forceIpv4?: boolean;
};

/** Build yt-dlp CLI args to fetch only a URL's thumbnail image; the video itself is skipped. */
export function buildThumbnailArgs(a: ThumbnailDownloadArgs): string[] {
  return [
    "--write-thumbnail",
    "--skip-download",
    "--no-playlist",
    ...cookieArgs(a.cookiesFromBrowser),
    ...(a.forceIpv4 ? ["--force-ipv4"] : []),
    ...(a.denoPath ? ["--js-runtimes", `deno:${a.denoPath}`] : []),
    "-o",
    a.outputTemplate,
    a.url,
  ];
}

export type ThumbnailResult = { filePath: string };

/**
 * Run yt-dlp to save only a URL's thumbnail. Resolves with the saved image path,
 * parsed from yt-dlp's "Writing ... thumbnail ... to:" stdout line, on a zero exit;
 * rejects with the stderr text on a non-zero exit. If the path line is not matched
 * the promise still resolves, with an empty `filePath`.
 */
export async function runThumbnailDownload(
  binaryPath: string,
  options: ThumbnailDownloadArgs,
): Promise<ThumbnailResult> {
  let filePath = "";
  const handleLine = (line: string) => {
    const match = /Writing .*?thumbnail.*? to:\s*(.+)$/.exec(line.trim());
    if (match) filePath = match[1].trim();
  };
  const { code, stderr } = await runWithWatchdog(binaryPath, buildThumbnailArgs(options), {
    idleMs: options.idleMs ?? DEFAULT_IDLE_MS,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    onStdoutLine: handleLine,
    abortSignal: options.abortSignal,
  });
  if (code === 0) return { filePath };
  throw new Error(stderr.trim() || `yt-dlp exited with code ${code}`);
}
