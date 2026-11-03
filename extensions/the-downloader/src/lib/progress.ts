/**
 * Structured yt-dlp progress.
 *
 * yt-dlp's default progress line (`[download]  42.0% of ~ 10.00MiB at 2.10MiB/s ETA 00:05`)
 * is meant for humans: sizes carry binary suffixes, fields go missing or gain a `~`
 * depending on the extractor. `--progress-template` makes yt-dlp print raw numbers
 * instead, behind a sentinel so the line can't be mistaken for anything else.
 * Missing values print as `NA`.
 */
export const PROGRESS_TAG = "THE-DOWNLOADER-PROGRESS:";

export const PROGRESS_TEMPLATE =
  `download:${PROGRESS_TAG}` +
  [
    "%(progress.downloaded_bytes)s",
    "%(progress.total_bytes)s",
    "%(progress.total_bytes_estimate)s",
    "%(progress.speed)s",
    "%(progress.eta)s",
  ].join(":");

export type YtdlpProgress = {
  /** 0–100 for the stream currently downloading. */
  percent?: number;
  downloadedBytes?: number;
  /** Exact size when the server published one, otherwise yt-dlp's estimate. */
  totalBytes?: number;
  /** Bytes per second. */
  speed?: number;
  /** Seconds left for the current stream. */
  eta?: number;
};

export type YtdlpEvent =
  | { type: "progress"; progress: YtdlpProgress }
  /** `[info] <id>: Downloading 1 format(s): 137+140` — how many streams will be fetched. */
  | { type: "formats"; streams: number }
  /** `[download] Destination: …` — a new stream started. */
  | { type: "stream-start" }
  /** `[download] … has already been downloaded` — a stream was skipped. */
  | { type: "stream-skipped" }
  /** A post-processor started (merge, audio extraction, remux, fixups). */
  | { type: "postprocess"; step: "merge" | "extract-audio" | "other" };

function num(value: string | undefined): number | undefined {
  if (value === undefined || value === "NA" || value === "None") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const LEGACY_PROGRESS_RE = /\[download\]\s+(\d+(?:\.\d+)?)%/;
const FORMATS_RE = /^\[info\] .*: Downloading \d+ format\(s\): (\S+)/;
const POSTPROCESSORS =
  /^\[(Merger|ExtractAudio|VideoRemuxer|VideoConvertor|FixupM3u8|FixupM4a|FixupStretched|FixupDuplicateMoov|FixupTimestamp|EmbedThumbnail|Metadata|MoveFiles)\]/;

/** Parse one line of yt-dlp stdout. Returns `undefined` for lines that carry nothing the UI needs. */
export function parseYtdlpLine(raw: string): YtdlpEvent | undefined {
  const line = raw.trim();
  if (!line) return undefined;

  if (line.startsWith(PROGRESS_TAG)) {
    const [downloaded, total, estimate, speed, eta] = line.slice(PROGRESS_TAG.length).split(":");
    const downloadedBytes = num(downloaded);
    const totalBytes = num(total) ?? num(estimate);
    const percent =
      downloadedBytes !== undefined && totalBytes ? Math.min(100, (downloadedBytes / totalBytes) * 100) : undefined;
    return {
      type: "progress",
      progress: { percent, downloadedBytes, totalBytes, speed: num(speed), eta: num(eta) },
    };
  }

  // Older yt-dlp builds (or a user config overriding the template) still print the human line.
  const legacy = LEGACY_PROGRESS_RE.exec(line);
  if (legacy) return { type: "progress", progress: { percent: Number(legacy[1]) } };

  const formats = FORMATS_RE.exec(line);
  if (formats) return { type: "formats", streams: formats[1].split("+").length };

  if (line.startsWith("[download] Destination:")) return { type: "stream-start" };
  if (line.startsWith("[download]") && line.includes("has already been downloaded")) {
    return { type: "stream-skipped" };
  }

  const post = POSTPROCESSORS.exec(line);
  if (post) {
    const step = post[1] === "Merger" ? "merge" : post[1] === "ExtractAudio" ? "extract-audio" : "other";
    return { type: "postprocess", step };
  }
  return undefined;
}
