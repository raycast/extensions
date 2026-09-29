import { Format, Video } from "../types.js";
import { formatBytes } from "./format.js";

// What each Quality choice will actually fetch, estimated from the formats yt-dlp
// listed for the URL. Mirrors `videoFormatSelector`: yt-dlp lists formats worst
// first, so "best" is the last match and "worst" the first.

export type QualityValue = "best" | "1080" | "720" | "480" | "smallest";

export const QUALITY_VALUES: QualityValue[] = ["best", "1080", "720", "480", "smallest"];

const QUALITY_TITLES: Record<QualityValue, string> = {
  best: "Best Available",
  "1080": "1080p",
  "720": "720p",
  "480": "480p",
  smallest: "Smallest File",
};

export type Estimate = {
  /** Height of the video stream that would be picked. */
  height?: number;
  /** Total bytes of every stream that would be downloaded; undefined when any size is unknown. */
  bytes?: number;
};

const hasVideo = (f: Format) => Boolean(f.vcodec) && f.vcodec !== "none";
const hasAudio = (f: Format) => Boolean(f.acodec) && f.acodec !== "none";

export function heightOf(f: Format): number | undefined {
  if (typeof f.height === "number" && f.height > 0) return f.height;
  const match = /^\d+x(\d+)$/.exec(f.resolution ?? "");
  return match ? Number(match[1]) : undefined;
}

function sizeOf(f: Format, duration: number): number | undefined {
  const exact = f.filesize ?? f.filesize_approx;
  if (exact) return exact;
  // Bitrate (kbit/s) times duration is what yt-dlp itself uses for filesize_approx.
  return f.tbr && duration > 0 ? (f.tbr * 1000 * duration) / 8 : undefined;
}

function pick(formats: Format[], keep: (f: Format) => boolean, best: boolean): Format | undefined {
  const matches = formats.filter(keep);
  return best ? matches.at(-1) : matches[0];
}

/** The formats `videoFormatSelector(quality, container)` would resolve to, or undefined when nothing matches. */
export function selectFormats(video: Video, quality: QualityValue, container: string): Format[] | undefined {
  const formats = video.formats ?? [];
  const cap = quality === "1080" || quality === "720" || quality === "480" ? Number(quality) : undefined;
  const best = quality !== "smallest";
  const fits = (f: Format) => cap === undefined || (heightOf(f) ?? Infinity) <= cap;
  const videoOnly = (f: Format) => hasVideo(f) && !hasAudio(f) && fits(f);
  const audioOnly = (f: Format) => hasAudio(f) && !hasVideo(f);
  const progressive = (f: Format) => hasVideo(f) && hasAudio(f) && fits(f);
  const avc = (f: Format) => f.vcodec.startsWith("avc1");

  const merged = (v?: Format, a?: Format) => (v && a ? [v, a] : undefined);
  const single = (f?: Format) => (f ? [f] : undefined);

  if (container === "mp4") {
    return (
      merged(
        pick(formats, (f) => videoOnly(f) && avc(f), best),
        pick(formats, (f) => audioOnly(f) && f.ext === "m4a", best),
      ) ??
      single(pick(formats, (f) => progressive(f) && avc(f), best)) ??
      merged(pick(formats, videoOnly, best), pick(formats, audioOnly, best)) ??
      single(pick(formats, progressive, best))
    );
  }
  if (container === "webm") {
    const webm = (f: Format) => f.ext === "webm";
    return (
      merged(
        pick(formats, (f) => videoOnly(f) && webm(f), best),
        pick(formats, (f) => audioOnly(f) && webm(f), best),
      ) ??
      single(pick(formats, (f) => progressive(f) && webm(f), best)) ??
      merged(pick(formats, videoOnly, best), pick(formats, audioOnly, best)) ??
      single(pick(formats, progressive, best))
    );
  }
  return (
    merged(pick(formats, videoOnly, best), pick(formats, audioOnly, best)) ?? single(pick(formats, progressive, best))
  );
}

export function estimateQuality(video: Video, quality: QualityValue, container: string): Estimate {
  const selected = selectFormats(video, quality, container);
  if (!selected) return {};
  const heights = selected.map(heightOf).filter((h): h is number => h !== undefined);
  const sizes = selected.map((f) => sizeOf(f, video.duration));
  return {
    height: heights.length > 0 ? Math.max(...heights) : undefined,
    bytes: sizes.every((s): s is number => s !== undefined) ? sizes.reduce((a, b) => a + b, 0) : undefined,
  };
}

/** Dropdown title for a quality choice, e.g. `1080p · ≈ 52.1 MB` or `1080p · 720p max · ≈ 40.2 MB`. */
export function qualityTitle(quality: QualityValue, estimate?: Estimate): string {
  const parts = [QUALITY_TITLES[quality]];
  if (estimate?.height) {
    const cap = Number(quality);
    if (Number.isNaN(cap)) parts.push(`${estimate.height}p`);
    else if (estimate.height < cap) parts.push(`${estimate.height}p max`);
  }
  if (estimate?.bytes) parts.push(`≈ ${formatBytes(estimate.bytes)}`);
  return parts.join(" · ");
}

/** The tallest video stream the site offers, for the form header. */
export function maxHeight(video: Video): number | undefined {
  const heights = (video.formats ?? []).filter(hasVideo).map(heightOf);
  const known = heights.filter((h): h is number => h !== undefined);
  return known.length > 0 ? Math.max(...known) : undefined;
}
