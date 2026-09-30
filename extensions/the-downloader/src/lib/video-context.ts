import { NoTranscriptReason, TranscriptSegment } from "../transcript.js";
import { Video } from "../types.js";
import { Chunk, chunkBody, estimateTokens, formatTimestamp, transcriptText } from "./link-context.js";
import { formatCount, formatUploadDate } from "./media-info.js";

export {
  estimateTokens,
  formatTimestamp,
  isOverviewRequest,
  linkifyTimestamps,
  parseTimestamp,
  scoreChunks,
  selectChunks,
  transcriptText,
  truncateToTokens,
} from "./link-context.js";
export type { Chunk } from "./link-context.js";

// Everything Chat About Video knows about one video — metadata, derived
// statistics and the timestamped transcript — and the text-handling around it:
// the dossier sent to the model, chunking, retrieval for small context windows,
// and turning `[12:34]` in answers into links to that moment.

export type VideoContext = {
  url: string;
  video: Video;
  segments: TranscriptSegment[];
  /** Caption language actually used, e.g. `en` or `en-orig`. */
  language?: string;
  /** Why there is no transcript, when `segments` is empty. */
  transcriptNote?: string;
  /** The kind of reason, e.g. `language` when captions exist but not in the chosen language. */
  transcriptReason?: NoTranscriptReason;
  fetchedAt: number;
};

export type VideoStats = {
  ageDays?: number;
  viewsPerDay?: number;
  /** Likes as a percentage of views. */
  likeRate?: number;
  commentsPer1kViews?: number;
};

const DAY = 24 * 60 * 60 * 1000;

function uploadTime(video: Video): number | undefined {
  if (typeof video.timestamp === "number" && video.timestamp > 0) return video.timestamp * 1000;
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(video.upload_date ?? "");
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}

/** Engagement figures derived from the counts the site reports. */
export function videoStats(video: Video, now = Date.now()): VideoStats {
  const uploaded = uploadTime(video);
  const ageDays = uploaded !== undefined ? Math.max((now - uploaded) / DAY, 1 / 24) : undefined;
  const views = video.view_count ?? undefined;
  return {
    ageDays,
    viewsPerDay: views !== undefined && ageDays !== undefined ? views / Math.max(ageDays, 1) : undefined,
    likeRate: views && video.like_count != null ? (video.like_count / views) * 100 : undefined,
    commentsPer1kViews: views && video.comment_count != null ? (video.comment_count / views) * 1000 : undefined,
  };
}

/** A link that opens the video `seconds` in, or undefined when the site has no such URL form. */
export function timestampUrl(ctx: Pick<VideoContext, "url" | "video">, seconds: number): string | undefined {
  const s = Math.max(0, Math.floor(seconds));
  const key = (ctx.video.extractor_key ?? "").toLowerCase();
  if (key === "youtube" && ctx.video.id) return `https://www.youtube.com/watch?v=${ctx.video.id}&t=${s}s`;
  if (key === "vimeo") return `${ctx.video.webpage_url ?? ctx.url}#t=${s}s`;
  return undefined;
}

/** Caption languages the site lists, uploaded ones separately from generated ones (YouTube's translations are left out). */
export function captionLanguages(video: Video): { uploaded: string[]; automatic: string[] } {
  const uploaded = Object.keys(video.subtitles ?? {}).filter((l) => l !== "live_chat");
  const original = Object.keys(video.automatic_captions ?? {}).filter((l) => l.endsWith("-orig"));
  // YouTube lists ~100 machine translations as automatic captions; only the `-orig` track is really spoken.
  const automatic = original.length > 0 ? original : Object.keys(video.automatic_captions ?? {});
  return { uploaded, automatic };
}

function statsLines(video: Video, now: number): string[] {
  const s = videoStats(video, now);
  const lines: string[] = [];
  const add = (label: string, value: string | undefined) => value && lines.push(`- ${label}: ${value}`);
  add("Views", formatCount(video.view_count));
  add("Likes", formatCount(video.like_count));
  add("Comments", formatCount(video.comment_count));
  add("Channel subscribers", formatCount(video.channel_follower_count));
  add("Uploaded", formatUploadDate(video.upload_date));
  add("Age", s.ageDays !== undefined ? `${Math.floor(s.ageDays)} days` : undefined);
  add("Views per day", s.viewsPerDay !== undefined ? formatCount(Math.round(s.viewsPerDay)) : undefined);
  add("Likes per 100 views", s.likeRate !== undefined ? s.likeRate.toFixed(2) : undefined);
  add("Comments per 1,000 views", s.commentsPer1kViews !== undefined ? s.commentsPer1kViews.toFixed(2) : undefined);
  return lines;
}

/** Plain-Markdown facts about the video for the model: metadata, statistics, chapters, tags and description. */
export function dossierMarkdown(ctx: VideoContext, now = Date.now(), descriptionLimit = 2000): string {
  const v = ctx.video;
  const parts: string[] = [`# ${v.title}`];
  const facts = [
    (v.uploader ?? v.channel)
      ? `- Channel: ${v.uploader ?? v.channel}${v.channel_is_verified ? " (verified)" : ""}`
      : "",
    `- URL: ${v.webpage_url ?? ctx.url}`,
    v.extractor_key ? `- Site: ${v.extractor_key}` : "",
    v.duration ? `- Duration: ${formatTimestamp(v.duration)}` : "",
    v.language ? `- Spoken language: ${v.language}` : "",
    ctx.language ? `- Transcript language: ${ctx.language}` : "",
    v.categories?.length ? `- Categories: ${v.categories.join(", ")}` : "",
    v.age_limit ? `- Age limit: ${v.age_limit}+` : "",
    v.was_live ? "- Originally a live stream" : "",
  ].filter(Boolean);
  parts.push(["## Facts", ...facts].join("\n"));
  const stats = statsLines(v, now);
  if (stats.length > 0) parts.push(["## Statistics", ...stats].join("\n"));
  if (v.chapters?.length) {
    parts.push(["## Chapters", ...v.chapters.map((c) => `- [${formatTimestamp(c.start_time)}] ${c.title}`)].join("\n"));
  }
  if (v.tags?.length) parts.push(`## Tags\n${v.tags.slice(0, 30).join(", ")}`);
  if (v.description?.trim()) {
    const d = v.description.trim();
    parts.push(`## Description\n${d.length > descriptionLimit ? `${d.slice(0, descriptionLimit)}…` : d}`);
  }
  return parts.join("\n\n");
}

/** Consecutive segments grouped into chunks of about `targetTokens`, each rendered as timestamped lines. */
export function chunkSegments(segments: TranscriptSegment[], targetTokens: number): Chunk[] {
  return chunkBody({ type: "segments", segments }, targetTokens);
}
