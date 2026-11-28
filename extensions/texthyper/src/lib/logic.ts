// Everything here is plain data in, plain data out, with no Raycast imports,
// so `npm test` can run it under Node.

import type { Article, Highlight, Library, SyncPage } from "./types";

export function parseTags(input: string | undefined): string[] {
  const names = (input ?? "")
    .split(",")
    .map((name) => name.trim().replace(/^#/, ""))
    .filter(Boolean);
  return [...new Set(names)];
}

// A URL someone would save: http(s), or a bare domain like "example.com/post".
export function asUrl(text: string | undefined): string | undefined {
  const candidate = (text ?? "").trim();
  if (!candidate || /\s/.test(candidate)) return undefined;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function displayTitle(article: Pick<Article, "title" | "url" | "domain">): string {
  return article.title?.trim() || article.domain || article.url;
}

export function fraction(article: Pick<Article, "progress">): number {
  return Math.min(Math.max(article.progress?.fraction ?? 0, 0), 1);
}

export function minutesLeft(article: Pick<Article, "reading_time" | "progress">): number {
  return Math.max(1, Math.ceil((article.reading_time ?? 1) * (1 - fraction(article))));
}

export function readingTime(minutes: number | null | undefined): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

const STARTED = 0.02;
const FINISHED = 0.95;

export function inProgress(article: Article): boolean {
  const read = fraction(article);
  return read >= STARTED && read < FINISHED;
}

function readable(article: Article): boolean {
  return !article.archived && article.status === "ready" && fraction(article) < FINISHED;
}

// Half-read articles, the one read most recently first.
export function continueReading(articles: Article[]): Article[] {
  return articles
    .filter((article) => readable(article) && inProgress(article))
    .sort((a, b) => (b.progress?.updated_at ?? "").localeCompare(a.progress?.updated_at ?? ""));
}

export function newestUnread(articles: Article[]): Article[] {
  return articles.filter((article) => !article.archived).sort((a, b) => b.saved_at.localeCompare(a.saved_at));
}

export type NextPick = { article: Article; fits: boolean };

// What to read with `minutes` to spare: the half-read article you were in
// last, else a random unread one, both only if what is left of them fits.
// When nothing fits, the shortest there is, flagged so the caller can say so.
export function pickNext(
  articles: Article[],
  minutes?: number,
  random: () => number = Math.random,
): NextPick | undefined {
  const candidates = articles.filter(readable);
  if (candidates.length === 0) return undefined;

  const fitting = minutes ? candidates.filter((article) => minutesLeft(article) <= minutes) : candidates;
  if (fitting.length === 0) {
    const shortest = [...candidates].sort((a, b) => minutesLeft(a) - minutesLeft(b))[0];
    return { article: shortest, fits: false };
  }

  const started = continueReading(fitting);
  if (started.length > 0) return { article: started[0], fits: true };
  return { article: fitting[Math.floor(random() * fitting.length)], fits: true };
}

// Which list an article belongs in. Folder and tag lists show what is unread
// in them, like the API's `state` default.
export function matchesFilter(article: Article, filter: string): boolean {
  const [kind, value] = splitFilter(filter);
  if (kind === "state") {
    if (value === "liked") return article.liked;
    if (value === "archived") return article.archived;
    if (value === "all") return true;
    return !article.archived;
  }
  if (kind === "folder") return !article.archived && article.folder_id === Number(value);
  return !article.archived && article.tags.some((tag) => tag.toLowerCase() === value.toLowerCase());
}

export function splitFilter(filter: string): ["state" | "folder" | "tag", string] {
  const at = filter.indexOf(":");
  const kind = filter.slice(0, at);
  const value = filter.slice(at + 1);
  if (kind === "folder" || kind === "tag") return [kind, value];
  return ["state", value || "unread"];
}

export function emptyLibrary(account: string): Library {
  return { account, cursor: 0, articles: {}, highlights: {}, folders: {}, tags: {} };
}

// The fields of an article the on-disk library keeps: enough for lists and
// Read Next, without the text-heavy ones.
export function slim(article: Article): Article {
  return {
    id: article.id,
    url: article.url,
    title: article.title,
    author: article.author,
    site_name: article.site_name,
    domain: article.domain,
    word_count: article.word_count,
    reading_time: article.reading_time,
    favicon_url: article.favicon_url,
    status: article.status,
    liked: article.liked,
    archived: article.archived,
    folder_id: article.folder_id,
    tags: article.tags,
    highlights_count: article.highlights_count,
    progress: article.progress,
    saved_at: article.saved_at,
  };
}

// One page of GET /sync applied the way docs/api.md says: upserts first,
// then deletions, and an article's highlights go with it.
export function applySync(library: Library, page: SyncPage): Library {
  const next: Library = {
    ...library,
    cursor: page.cursor,
    articles: { ...library.articles },
    highlights: { ...library.highlights },
    folders: { ...library.folders },
    tags: { ...library.tags },
  };
  for (const article of page.articles) next.articles[article.id] = slim(article);
  for (const highlight of page.highlights) next.highlights[highlight.id] = highlight;
  for (const folder of page.folders) next.folders[folder.id] = folder;
  for (const tag of page.tags) next.tags[tag.id] = tag;

  for (const deletion of page.deletions) {
    const id = deletion.record_id;
    if (deletion.record_type === "article") {
      delete next.articles[id];
      for (const highlight of Object.values(next.highlights)) {
        if (highlight.article_id === id) delete next.highlights[highlight.id];
      }
    } else if (deletion.record_type === "highlight") {
      delete next.highlights[id];
    } else if (deletion.record_type === "folder") {
      delete next.folders[id];
    } else if (deletion.record_type === "tag") {
      delete next.tags[id];
    }
  }
  return next;
}

export function quoteText(highlight: Pick<Highlight, "quote">): string {
  return (highlight.quote?.exact ?? "").replace(/\s+/g, " ").trim();
}

// A highlight as Markdown for a notes app: the quote, the note, the source.
export function highlightMarkdown(highlight: Highlight, article?: Article): string {
  const lines = [`> ${quoteText(highlight)}`];
  if (highlight.comment?.trim()) lines.push("", highlight.comment.trim());
  if (article) {
    const by = article.author?.trim() ? `${article.author.trim()}, ` : "";
    lines.push("", `${by}[${escapeBrackets(displayTitle(article))}](${article.url})`);
  }
  return lines.join("\n");
}

export function markdownLink(article: Article): string {
  return `[${escapeBrackets(displayTitle(article))}](${article.url})`;
}

function escapeBrackets(text: string): string {
  return text.replace(/([[\]])/g, "\\$1");
}

// The original page, scrolled to the quote where the browser supports text
// fragments. Long quotes are given as their first and last words.
export function textFragmentUrl(url: string, quote: string): string {
  const words = quote.split(" ").filter(Boolean);
  if (words.length === 0) return url;
  const encode = (text: string) => encodeURIComponent(text).replace(/-/g, "%2D");
  const directive =
    words.length <= 10
      ? encode(words.join(" "))
      : `${encode(words.slice(0, 5).join(" "))},${encode(words.slice(-5).join(" "))}`;
  return `${url.split("#")[0]}#:~:text=${directive}`;
}

// Search snippets come as HTML with <mark> around the hits.
export function snippetMarkdown(snippet: string): string {
  return decodeEntities(
    snippet
      .replace(/<mark>/g, "**")
      .replace(/<\/mark>/g, "**")
      .replace(/<[^>]+>/g, ""),
  );
}

export function snippetText(snippet: string): string {
  return decodeEntities(snippet.replace(/<[^>]+>/g, ""));
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// A long text in parts, like the MCP server's read_article.
export function part(text: string, offset = 0, size = 40_000): { text: string; next_offset: number | null } {
  const start = Math.max(0, Math.floor(offset));
  const end = start + size;
  return { text: text.slice(start, end), next_offset: end < text.length ? end : null };
}
