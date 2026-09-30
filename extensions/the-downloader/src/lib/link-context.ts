import { NoTranscriptReason, TranscriptSegment } from "../transcript.js";
import { Chapter, Video } from "../types.js";
import { formatClock } from "./format.js";

// Everything Chat About Link knows about one link — a video, a social post or a
// web page — in one shape, and the text handling around it: the facts sent to
// the model, the body (a timestamped transcript or paragraphs), chunking and
// retrieval for small context windows, and `[12:34]` links for videos.

export type LinkKind = "video" | "post" | "page";

/** One line of facts or statistics; an empty label prints the value alone. */
export type LinkFact = { label: string; value: string };

export type LinkBody =
  { type: "segments"; segments: TranscriptSegment[] } | { type: "paragraphs"; paragraphs: string[] };

/** Why the body is empty: a transcript reason, a login wall, or a page without readable text. */
export type LinkNoteReason = NoTranscriptReason | "blocked" | "unreadable";

export type LinkContext = {
  url: string;
  kind: LinkKind;
  /** Chat key: `<extractor>:<id>` for videos, `<category>:<id>` for posts, the URL for pages. */
  key: string;
  /** "YouTube", "Instagram", "example.com". */
  site: string;
  title: string;
  author?: string;
  authorVerified?: boolean;
  /** `YYYY-MM-DD`. */
  publishedAt?: string;
  thumbnail?: string;
  /** Kind-specific facts, e.g. Duration and Spoken language for a video. */
  facts: LinkFact[];
  stats: LinkFact[];
  description?: string;
  chapters?: Chapter[];
  tags?: string[];
  body: LinkBody;
  /** Caption language actually used, e.g. `en` or `en-orig` (videos). */
  language?: string;
  /** Image URLs (posts). */
  images?: string[];
  /** Why the body is empty. */
  note?: string;
  noteReason?: LinkNoteReason;
  /** Slim yt-dlp metadata, for videos: timestamps, formats, Media Preview. */
  video?: Video;
  /** Set when the text came from the Internet Archive's saved copy rather than the live page. */
  archive?: { viewUrl: string; savedOn: string };
  fetchedAt: number;
};

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

const STAMP = String.raw`\d{1,2}(?::\d{2}){1,2}`;
/** `[12:34]`, `[1:02:03]`, or a range such as `[4:25–6:02]`, not already a link. */
const BARE_STAMP = new RegExp(String.raw`\[(${STAMP})(\s*[–—-]\s*${STAMP})?\](?!\()`, "g");

/**
 * Turn bare `[12:34]` / `[1:02:03]` in an answer into links to that moment,
 * and a range like `[4:25–6:02]` into a link to where it starts (links
 * already present are left alone).
 */
export function linkifyTimestamps(markdown: string, link: (seconds: number) => string | undefined): string {
  return markdown.replace(BARE_STAMP, (match, stamp: string, range: string | undefined) => {
    const seconds = parseTimestamp(stamp);
    const url = seconds === undefined ? undefined : link(seconds);
    return url ? `[${stamp}${range ?? ""}](${url})` : match;
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

/**
 * A link that couldn't be loaded; `fix` names what can get past it: a setting
 * to change, or the Internet Archive's saved copy of the page.
 */
export class LinkLoadError extends Error {
  constructor(
    message: string,
    readonly fix?: "preferences" | "archive",
  ) {
    super(message);
    this.name = "LinkLoadError";
  }
}

/** True when there is a transcript, caption or article text to send. */
export function hasBody(ctx: Pick<LinkContext, "body">): boolean {
  return ctx.body.type === "segments" ? ctx.body.segments.length > 0 : ctx.body.paragraphs.length > 0;
}

/** The body as text: `[m:ss] …` lines for a transcript, paragraphs separated by blank lines otherwise. */
export function bodyText(body: LinkBody): string {
  return body.type === "segments" ? transcriptText(body.segments) : body.paragraphs.join("\n\n");
}

function factLine(f: LinkFact): string {
  return f.label ? `- ${f.label}: ${f.value}` : `- ${f.value}`;
}

/** Plain-Markdown facts about the link for the model: who, where, when, statistics, chapters, tags and description. */
export function dossierMarkdown(ctx: LinkContext, descriptionLimit = 2000): string {
  const parts: string[] = [`# ${ctx.title}`];
  const facts = [
    ctx.author
      ? `- ${ctx.kind === "video" ? "Channel" : "Author"}: ${ctx.author}${ctx.authorVerified ? " (verified)" : ""}`
      : "",
    `- URL: ${ctx.url}`,
    `- Site: ${ctx.site}`,
    ctx.publishedAt ? `- Published: ${ctx.publishedAt}` : "",
    ...ctx.facts.map(factLine),
  ].filter(Boolean);
  parts.push(["## Facts", ...facts].join("\n"));
  if (ctx.stats.length > 0) parts.push(["## Statistics", ...ctx.stats.map(factLine)].join("\n"));
  if (ctx.chapters?.length) {
    parts.push(
      ["## Chapters", ...ctx.chapters.map((c) => `- [${formatTimestamp(c.start_time)}] ${c.title}`)].join("\n"),
    );
  }
  if (ctx.tags?.length) parts.push(`## Tags\n${ctx.tags.slice(0, 30).join(", ")}`);
  const description = ctx.description?.trim();
  if (description) {
    parts.push(
      `## Description\n${description.length > descriptionLimit ? `${description.slice(0, descriptionLimit)}…` : description}`,
    );
  }
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Chunking and retrieval, for models whose context can't hold the whole body.
// ---------------------------------------------------------------------------

/** A run of the body. `start`/`end` are seconds for a transcript and paragraph numbers otherwise. */
export type Chunk = { start: number; end: number; text: string };

/** `text` in pieces of at most about `maxTokens`: whole sentences where it has them, else even slices. */
function splitToFit(text: string, maxTokens: number): string[] {
  if (estimateTokens(text) <= maxTokens) return [text];
  const pieces: string[] = [];
  let current = "";
  for (const sentence of text.split(/(?<=[.!?。！？])\s*/u)) {
    if (!sentence) continue;
    if (estimateTokens(sentence) > maxTokens) {
      if (current) pieces.push(current);
      current = "";
      // No sentence breaks to use (a list, or Chinese without spaces): cut evenly.
      const parts = Math.ceil(estimateTokens(sentence) / maxTokens) + 1;
      const size = Math.ceil(sentence.length / parts);
      for (let i = 0; i < sentence.length; i += size) pieces.push(sentence.slice(i, i + size));
      continue;
    }
    const joined = current ? `${current} ${sentence}` : sentence;
    if (current && estimateTokens(joined) > maxTokens) {
      pieces.push(current);
      current = sentence;
    } else {
      current = joined;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/**
 * The body in chunks of about `targetTokens`: consecutive transcript lines, or
 * consecutive paragraphs (a paragraph too long for one chunk is split first).
 */
export function chunkBody(body: LinkBody, targetTokens: number): Chunk[] {
  const units =
    body.type === "segments"
      ? body.segments.map((s) => ({ pos: s.start, text: `[${formatTimestamp(s.start)}] ${s.text}` }))
      : body.paragraphs.flatMap((p, i) => splitToFit(p, targetTokens).map((text) => ({ pos: i, text })));
  const separator = body.type === "segments" ? "\n" : "\n\n";
  const chunks: Chunk[] = [];
  let lines: string[] = [];
  let start = 0;
  let end = 0;
  let tokens = 0;
  for (const unit of units) {
    const t = estimateTokens(unit.text);
    if (lines.length > 0 && tokens + t > targetTokens) {
      chunks.push({ start, end, text: lines.join(separator) });
      lines = [];
      tokens = 0;
    }
    if (lines.length === 0) start = unit.pos;
    lines.push(unit.text);
    end = unit.pos;
    tokens += t;
  }
  if (lines.length > 0) chunks.push({ start, end, text: lines.join(separator) });
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
 * Chunks for `query` that fit in `budgetTokens`, back in reading order: the ones
 * that match the question first, then chunks spread over the rest of the text
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
  const order = new Map(chunks.map((c, i) => [c, i]));
  return picked.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

/** Chunks reordered so taking a prefix samples the whole text: first, last, middle, quarters… */
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

/** Requests that need the whole text rather than a few relevant passages. */
export function isOverviewRequest(question: string): boolean {
  return /\b(summar\w*|overview|tl;?dr|recap|key (points|takeaways|ideas)|main (points|ideas|arguments)|takeaways|outline|chapters?|what is (this|the) (video|post|article|page) about|(whole|entire) (video|post|article|page)|everything)\b/i.test(
    question,
  );
}
