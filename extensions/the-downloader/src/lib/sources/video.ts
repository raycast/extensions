import { NoTranscriptError, NoTranscriptReason, TranscriptSegment, fetchTranscriptSegments } from "../../transcript.js";
import { Format, Video } from "../../types.js";
import { hostnameOf } from "../detect.js";
import { LinkContext, LinkFact, formatTimestamp } from "../link-context.js";
import { formatCount } from "../media-info.js";

// Videos: yt-dlp's metadata plus the timestamped transcript, as a LinkContext.
// Video-only helpers (moment links, caption languages, engagement rates) live
// here too.

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
export function timestampUrl(ctx: { url: string; video?: Video }, seconds: number): string | undefined {
  if (!ctx.video) return undefined;
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

/** The video without per-format download URLs and other bulk the chat never reads. */
export function slimVideo(video: Video): Video {
  const formats: Format[] = (video.formats ?? []).map((f) => ({
    format_id: f.format_id,
    vcodec: f.vcodec,
    acodec: f.acodec,
    ext: f.ext,
    video_ext: f.video_ext,
    protocol: f.protocol,
    resolution: f.resolution,
    tbr: f.tbr,
    height: f.height,
    fps: f.fps,
    filesize: f.filesize,
    filesize_approx: f.filesize_approx,
  }));
  const slim = { ...video, formats } as Video & Record<string, unknown>;
  for (const bulky of [
    "thumbnails",
    "automatic_captions",
    "subtitles",
    "requested_formats",
    "heatmap",
    "http_headers",
  ]) {
    delete slim[bulky];
  }
  return slim;
}

const SITE_NAMES: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  twitter: "X",
  vimeo: "Vimeo",
  dailymotion: "Dailymotion",
  bilibili: "Bilibili",
  facebook: "Facebook",
  soundcloud: "SoundCloud",
  streamable: "Streamable",
  instagram: "Instagram",
};

function siteName(video: Video, url: string): string {
  const key = (video.extractor_key ?? "").toLowerCase();
  const known = Object.keys(SITE_NAMES).find((k) => key === k || key.startsWith(k));
  if (known) return SITE_NAMES[known];
  if (key.startsWith("twitch")) return "Twitch";
  return hostnameOf(url) || video.extractor_key || "Video";
}

function publishedAt(video: Video): string | undefined {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(video.upload_date ?? "");
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const time = uploadTime(video);
  return time !== undefined ? new Date(time).toISOString().slice(0, 10) : undefined;
}

function statsOf(video: Video, now: number): LinkFact[] {
  const s = videoStats(video, now);
  const stats: LinkFact[] = [];
  const add = (label: string, value: string | undefined) => value && stats.push({ label, value });
  add("Views", formatCount(video.view_count));
  add("Likes", formatCount(video.like_count));
  add("Comments", formatCount(video.comment_count));
  add("Channel subscribers", formatCount(video.channel_follower_count));
  add("Age", s.ageDays !== undefined ? `${Math.floor(s.ageDays)} days` : undefined);
  add("Views per day", s.viewsPerDay !== undefined ? formatCount(Math.round(s.viewsPerDay)) : undefined);
  add("Likes per 100 views", s.likeRate !== undefined ? s.likeRate.toFixed(2) : undefined);
  add("Comments per 1,000 views", s.commentsPer1kViews !== undefined ? s.commentsPer1kViews.toFixed(2) : undefined);
  return stats;
}

function factsOf(video: Video, language?: string): LinkFact[] {
  const facts: LinkFact[] = [];
  const add = (label: string, value: string | undefined | null | false) => value && facts.push({ label, value });
  add("Duration", video.duration ? formatTimestamp(video.duration) : undefined);
  add("Spoken language", video.language);
  add("Transcript language", language);
  // Listed here because the cached, slimmed video drops the caption tracks.
  const captions = captionLanguages(video);
  const list = (langs: string[]) => (langs.length > 12 ? `${langs.slice(0, 12).join(", ")}, …` : langs.join(", "));
  add("Uploaded captions", list(captions.uploaded));
  add("Automatic captions", list(captions.automatic));
  add("Categories", video.categories?.join(", "));
  add("Age limit", video.age_limit ? `${video.age_limit}+` : undefined);
  add("", video.was_live && "Originally a live stream");
  return facts;
}

export type VideoTranscript =
  { segments: TranscriptSegment[]; language?: string } | { note: string; reason: NoTranscriptReason };

/** A video and its transcript (or why there is none) as a LinkContext. */
export function videoToLink(url: string, video: Video, transcript: VideoTranscript, now = Date.now()): LinkContext {
  const segments = "segments" in transcript ? transcript.segments : [];
  const language = "segments" in transcript ? transcript.language : undefined;
  const { id, extractor_key } = video;
  return {
    url,
    kind: "video",
    // Unchanged from Chat About Video, so chats saved before still open.
    key: id && extractor_key ? `${extractor_key.toLowerCase()}:${id}` : url,
    site: siteName(video, url),
    title: video.title,
    author: video.uploader ?? video.channel ?? undefined,
    authorVerified: video.channel_is_verified ?? undefined,
    publishedAt: publishedAt(video),
    thumbnail: video.thumbnail ?? undefined,
    facts: factsOf(video, language),
    stats: statsOf(video, now),
    description: video.description ?? undefined,
    chapters: video.chapters ?? undefined,
    tags: video.tags ?? undefined,
    body: { type: "segments", segments },
    language,
    note: "note" in transcript ? transcript.note : undefined,
    noteReason: "note" in transcript ? transcript.reason : undefined,
    video: slimVideo(video),
    fetchedAt: now,
  };
}

/**
 * Metadata and timestamped transcript for a video link. A video without usable
 * captions still loads, with an empty transcript, so its details can be asked about.
 */
export async function loadVideoLink(
  url: string,
  options: { signal?: AbortSignal; language?: string },
): Promise<LinkContext> {
  try {
    const { video, segments, language } = await fetchTranscriptSegments(
      url,
      options.language || "auto",
      options.signal,
    );
    return videoToLink(url, video, { segments, language });
  } catch (error) {
    if (!(error instanceof NoTranscriptError)) throw error;
    return videoToLink(url, error.video, { note: error.message, reason: error.reason });
  }
}
