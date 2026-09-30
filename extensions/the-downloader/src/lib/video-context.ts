import { NoTranscriptReason, TranscriptSegment } from "../transcript.js";
import { Video } from "../types.js";
import { formatClock } from "./format.js";
import { formatCount, formatUploadDate } from "./media-info.js";

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

/** `75` → `1:15`, `3725` → `1:02:05`. Floors, so a timestamp never points past the moment. */
export function formatTimestamp(seconds: number): string {
  return formatClock(Math.floor(seconds));
}

/** Parse `1:15` or `1:02:05` back to seconds. */
export function parseTimestamp(text: string): number | undefined {
  const parts = text.split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isInteger(p) || p < 0)) return undefined;
  return parts.reduce((total, p) => total * 60 + p, 0);
}

/** Turn bare `[12:34]` / `[1:02:03]` in an answer into links to that moment (links already present are left alone). */
export function linkifyTimestamps(markdown: string, link: (seconds: number) => string | undefined): string {
  return markdown.replace(/\[(\d{1,2}(?::\d{2}){1,2})\](?!\()/g, (match, stamp: string) => {
    const seconds = parseTimestamp(stamp);
    const url = seconds === undefined ? undefined : link(seconds);
    return url ? `[${stamp}](${url})` : match;
  });
}

/** One line per segment: `[1:15] …`. */
export function transcriptText(segments: TranscriptSegment[]): string {
  return segments.map((s) => `[${formatTimestamp(s.start)}] ${s.text}`).join("\n");
}

/** Chinese, Japanese and Korean characters (Hangul jamo, kana, CJK ideographs, Hangul syllables, full-width forms). */
function isDenseScript(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x3000 && code <= 0x30ff) ||
    (code >= 0x3130 && code <= 0x318f) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef)
  );
}

/**
 * Rough token count for budgeting prompts, fitted to Apple's tokenizer
 * (`fm count-tokens`): about 4 ASCII characters per token, 3 for other
 * alphabets (accented Latin, Cyrillic, Arabic…) and 1.4 for Chinese, Japanese
 * and Korean — counting those at 4 would overflow the model's window.
 */
export function estimateTokens(text: string): number {
  let ascii = 0;
  let dense = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) ascii++;
    else if (isDenseScript(code)) dense++;
  }
  return Math.ceil(ascii / 4 + (text.length - ascii - dense) / 3 + dense * 0.7);
}

/** `text` cut to about `tokens`, ending in an ellipsis when cut. */
export function truncateToTokens(text: string, tokens: number): string {
  const estimate = estimateTokens(text);
  if (estimate <= tokens) return text;
  return `${text.slice(0, Math.floor((text.length * tokens) / estimate))}…`;
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

// ---------------------------------------------------------------------------
// Chunking and retrieval, for models whose context can't hold the whole transcript.
// ---------------------------------------------------------------------------

export type Chunk = { start: number; end: number; text: string };

/** Consecutive segments grouped into chunks of about `targetTokens`, each rendered as timestamped lines. */
export function chunkSegments(segments: TranscriptSegment[], targetTokens: number): Chunk[] {
  const chunks: Chunk[] = [];
  let lines: string[] = [];
  let start = 0;
  let end = 0;
  let tokens = 0;
  for (const seg of segments) {
    const line = `[${formatTimestamp(seg.start)}] ${seg.text}`;
    const t = estimateTokens(line);
    if (lines.length > 0 && tokens + t > targetTokens) {
      chunks.push({ start, end, text: lines.join("\n") });
      lines = [];
      tokens = 0;
    }
    if (lines.length === 0) start = seg.start;
    lines.push(line);
    end = seg.start;
    tokens += t;
  }
  if (lines.length > 0) chunks.push({ start, end, text: lines.join("\n") });
  return chunks;
}

const STOPWORDS = new Set(
  "a an and are as at be but by did do does for from had has have he her his how i if in into is it its me my of on or our she so that the their them then there these they this to was we were what when where which who why will with you your about can could would should video say says said talk talks".split(
    " ",
  ),
);

function terms(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** BM25 score of every chunk against `query`, in chunk order. */
export function scoreChunks(chunks: Chunk[], query: string): number[] {
  const q = [...new Set(terms(query))];
  if (q.length === 0 || chunks.length === 0) return chunks.map(() => 0);
  const docs = chunks.map((c) => terms(c.text));
  const avg = docs.reduce((a, d) => a + d.length, 0) / docs.length || 1;
  const df = new Map(q.map((t) => [t, docs.filter((d) => d.includes(t)).length]));
  const k1 = 1.2;
  const b = 0.75;
  return docs.map((doc) => {
    let score = 0;
    for (const t of q) {
      const tf = doc.filter((w) => w === t).length;
      if (tf === 0) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (chunks.length - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / avg)));
    }
    return score;
  });
}

/**
 * Chunks for `query` that fit in `budgetTokens`, back in video order: the ones
 * that match the question first, then chunks spread over the rest of the video
 * so a vague question still sees its start, middle and end.
 */
export function selectChunks(chunks: Chunk[], query: string, budgetTokens: number): Chunk[] {
  const scores = scoreChunks(chunks, query);
  const matching = chunks
    .map((chunk, i) => ({ chunk, score: scores[i], i }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((c) => c.chunk);
  const rest = spread(chunks).filter((c) => !matching.includes(c));
  const picked: Chunk[] = [];
  let used = 0;
  for (const c of [...matching, ...rest]) {
    const t = estimateTokens(c.text);
    if (used + t > budgetTokens) continue;
    picked.push(c);
    used += t;
  }
  return picked.sort((a, b) => a.start - b.start);
}

/** Chunks reordered so taking a prefix samples the whole video: first, last, middle, quarters… */
function spread(chunks: Chunk[]): Chunk[] {
  const out: Chunk[] = [];
  const seen = new Set<number>();
  const visit = (i: number) => {
    if (i >= 0 && i < chunks.length && !seen.has(i)) {
      seen.add(i);
      out.push(chunks[i]);
    }
  };
  visit(0);
  visit(chunks.length - 1);
  for (let parts = 2; out.length < chunks.length; parts *= 2) {
    for (let k = 1; k < parts; k += 2) visit(Math.round(((chunks.length - 1) * k) / parts));
    if (parts > chunks.length * 2) chunks.forEach((_, i) => visit(i));
  }
  return out;
}

/** Requests that need the whole video rather than a few relevant passages. */
export function isOverviewRequest(question: string): boolean {
  return /\b(summar\w*|overview|tl;?dr|recap|key (points|takeaways|ideas)|main (points|ideas|arguments)|takeaways|outline|chapters?|what is (this|the) video about|whole video|entire video|everything)\b/i.test(
    question,
  );
}
