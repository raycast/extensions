import { execa } from "execa";
import { Video } from "../types.js";
import { PROGRESS_TEMPLATE, YtdlpEvent, parseYtdlpLine } from "./progress.js";
import { DEFAULT_IDLE_MS, runWithWatchdog } from "./run.js";

/**
 * Pull the first JSON object out of yt-dlp's stdout. yt-dlp can emit `[debug]`
 * or `[warning]` lines on stdout before the JSON when its config has tracing
 * on, so a naive `JSON.parse(stdout)` would throw a SyntaxError and the form
 * silently treats the URL as unknown. Scan for the first line that starts with
 * `{` and parse from there.
 */
export function extractDumpJson(stdout: string): Video {
  const lines = stdout.split("\n");
  const jsonStart = lines.findIndex((line) => line.trimStart().startsWith("{"));
  if (jsonStart === -1) {
    throw new Error("yt-dlp produced no JSON metadata. Try updating yt-dlp via the Update Libraries action.");
  }
  const json = lines.slice(jsonStart).join("\n");
  return JSON.parse(json) as Video;
}

/**
 * Fetch yt-dlp metadata for a URL via --dump-json. `denoPath`, when given,
 * points yt-dlp at its JS runtime. `opts.signal` cancels the fetch (so a stale
 * metadata probe is killed when the URL changes or the form unmounts), and
 * `opts.timeoutMs` caps total runtime so a wedged extractor can't hang forever.
 */
export async function fetchVideoInfo(
  ytdlPath: string,
  url: string,
  forceIpv4: boolean,
  denoPath?: string,
  opts?: { signal?: AbortSignal; timeoutMs?: number; knownSitesOnly?: boolean },
): Promise<Video> {
  const result = await execa(
    ytdlPath,
    [
      forceIpv4 ? "--force-ipv4" : "",
      denoPath ? "--js-runtimes" : "",
      denoPath ? `deno:${denoPath}` : "",
      "--no-playlist",
      ...(opts?.knownSitesOnly ? KNOWN_SITES_ONLY : []),
      "--no-warnings",
      "--quiet",
      "--dump-json",
      url,
    ].filter(Boolean),
    {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      cancelSignal: opts?.signal,
      timeout: opts?.timeoutMs ?? 0,
    },
  );
  return extractDumpJson(result.stdout);
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
 * playlist URL (no video reference) still downloads every entry.
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
  ];
  if (a.denoPath) {
    args.push("--js-runtimes", `deno:${a.denoPath}`);
  }
  const [downloadFormat, target] = a.format.split("#");
  if (downloadFormat === "bestaudio") {
    // Without an explicit selector yt-dlp would download its default best
    // video+audio and then strip the audio — many times the bytes needed.
    // `/best` covers sites that publish no audio-only stream.
    args.push("--format", "bestaudio/best", "--extract-audio", "--audio-format", target, "--audio-quality", "0");
  } else {
    // "webm/mkv": when the selector had to fall back to streams WebM can't hold
    // (e.g. H.264 + AAC), yt-dlp merges into mkv instead of failing the merge.
    args.push("--format", downloadFormat, "--merge-output-format", target === "webm" ? "webm/mkv" : target);
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

export type VideoDownloadResult = { filePath: string };

/**
 * Run yt-dlp for a media download. `onProgress` receives the download percentage
 * as yt-dlp reports it; `onEvent`, when given, receives every parsed progress,
 * stream and post-processing event (see `parseYtdlpLine`). Resolves with the
 * downloaded file path on a zero exit; rejects with the stderr text on a non-zero
 * exit, or with a watchdog error if yt-dlp stalls. Progress and the
 * `after_move:filepath` line are read from stdout.
 */
export async function runVideoDownload(
  binaryPath: string,
  options: VideoDownloadArgs,
  onProgress: (percent: number) => void,
  onEvent?: (event: YtdlpEvent) => void,
): Promise<VideoDownloadResult> {
  let filePath = "";
  let skippedLive = false;
  // Line-buffered (via onStdoutLine) so a tagged filepath split across two
  // stream chunks is still matched whole.
  const handleLine = (line: string) => {
    if (/does not pass filter \(!is_live\)/.test(line)) skippedLive = true;
    const event = parseYtdlpLine(line);
    if (event) {
      if (event.type === "progress" && event.progress.percent !== undefined) onProgress(event.progress.percent);
      onEvent?.(event);
      return;
    }
    const tagged = FILEPATH_LINE_RE.exec(line.trim());
    if (tagged) {
      filePath = tagged[1].trim();
    }
  };
  const { code, stderr } = await runWithWatchdog(binaryPath, buildVideoDownloadArgs(options), {
    idleMs: options.idleMs ?? DEFAULT_IDLE_MS,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    onStdoutLine: handleLine,
    abortSignal: options.abortSignal,
  });
  if (code === 0 && skippedLive && !filePath) throw new LiveStreamError();
  if (code === 0) return { filePath };
  throw new Error(stderr.trim() || `yt-dlp exited with code ${code}`);
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
};

/** Build yt-dlp CLI args to fetch only a URL's thumbnail image; the video itself is skipped. */
export function buildThumbnailArgs(a: ThumbnailDownloadArgs): string[] {
  return [
    "--write-thumbnail",
    "--skip-download",
    "--no-playlist",
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
