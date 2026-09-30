import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { decodeHtml } from "../charset.js";
import { LinkContext, LinkFact, LinkLoadError } from "../link-context.js";
import { HttpError, safeFetch } from "../safe-fetch.js";

// Web pages and articles: fetched with safeFetch (never the local network),
// decoded with their own charset, the main text found by Mozilla Readability
// (Firefox's Reader View) on a linkedom document, and the title, site, author
// and date taken from OpenGraph, JSON-LD and the <title>.

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
/** Less text than this is a login wall, a JavaScript app or an error page, not an article. */
const MIN_TEXT = 200;
const WORDS_PER_MINUTE = 200;
const UNREADABLE = "Couldn't read this page's text (it may need a login or JavaScript).";

/** Elements that hold a paragraph of text; the innermost ones are kept. */
const BLOCKS = "p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, figcaption, dd, dt, td";

type Doc = ReturnType<typeof parseHTML>["document"];
type Json = Record<string, unknown>;

const clean = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

function metaContent(document: Doc, ...selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const value = clean(document.querySelector(selector)?.getAttribute("content"));
    if (value) return value;
  }
  return undefined;
}

/** Schema.org objects from every JSON-LD block, `@graph`s flattened. */
function jsonLd(document: Doc): Json[] {
  const out: Json[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      out.push(value as Json);
      if ("@graph" in value) visit((value as Json)["@graph"]);
    }
  };
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      visit(JSON.parse(script.textContent ?? ""));
    } catch {
      /* broken JSON-LD — ignore it */
    }
  }
  return out;
}

const isArticle = (o: Json) =>
  [o["@type"]].flat().some((t) => typeof t === "string" && /Article|BlogPosting|Report|NewsArticle/.test(t));

function names(value: unknown): string | undefined {
  const list = [value]
    .flat()
    .map((a) => (typeof a === "string" ? a : typeof a === "object" && a ? (a as Json).name : undefined))
    .filter((n): n is string => typeof n === "string" && !!n.trim());
  return list.length ? list.map(clean).join(", ") : undefined;
}

function isoDate(value: string | undefined): string | undefined {
  return /^\d{4}-\d{2}-\d{2}/.exec(value ?? "")?.[0];
}

/** "Headline - Site" → "Headline" when the suffix is the site's name. */
function withoutSiteSuffix(title: string, site: string | undefined): string {
  if (!site) return title;
  for (const separator of [" - ", " | ", " – ", " — ", " · "]) {
    if (title.endsWith(`${separator}${site}`)) return title.slice(0, -(separator.length + site.length)).trim();
  }
  return title;
}

/** The article's text blocks, innermost first so nested blocks aren't read twice. */
function paragraphsOf(html: string): string[] {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const blocks = [...document.querySelectorAll(BLOCKS)].filter((el) => !el.querySelector(BLOCKS));
  const out: string[] = [];
  for (const block of blocks) {
    const text = clean(block.textContent);
    if (text && text !== out.at(-1)) out.push(text);
  }
  if (out.length === 0) {
    const text = clean(document.body?.textContent);
    if (text) out.push(text);
  }
  return out;
}

function stripHash(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** A fetched page as a LinkContext. Pure: `html` is already decoded. */
export function parsePage(html: string, url: string, now = Date.now()): LinkContext {
  const { document } = parseHTML(html);
  // Metadata first: Readability rewrites the document it reads.
  const ld = jsonLd(document);
  const article = ld.find(isArticle);
  const site =
    metaContent(document, 'meta[property="og:site_name"]', 'meta[name="application-name"]') ??
    names((article?.publisher as Json | undefined)?.name) ??
    names(ld.find((o) => o["@type"] === "WebSite")?.name) ??
    hostOf(url);
  const rawTitle =
    (typeof article?.headline === "string" ? clean(article.headline) : undefined) ??
    metaContent(document, 'meta[property="og:title"]', 'meta[name="twitter:title"]') ??
    clean(document.querySelector("title")?.textContent);
  const author =
    names(article?.author) ??
    metaContent(document, 'meta[name="author"]', 'meta[property="article:author"]:not([content^="http"])');
  const published = isoDate(
    (typeof article?.datePublished === "string" ? article.datePublished : undefined) ??
      metaContent(document, 'meta[property="article:published_time"]', 'meta[itemprop="datePublished"]') ??
      document.querySelector("time[datetime]")?.getAttribute("datetime") ??
      undefined,
  );
  const description = metaContent(
    document,
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
  );
  const image = metaContent(document, 'meta[property="og:image"]', 'meta[name="twitter:image"]');
  const language = clean(document.documentElement?.getAttribute("lang")) || undefined;

  const readable = new Readability(document as unknown as Document, { charThreshold: MIN_TEXT }).parse();
  let paragraphs = readable?.content ? paragraphsOf(readable.content) : [];
  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  if (paragraphs.join(" ").length < MIN_TEXT) paragraphs = [];

  const title = withoutSiteSuffix(rawTitle || clean(readable?.title) || hostOf(url), site);
  const facts: LinkFact[] = [];
  if (paragraphs.length) {
    facts.push({ label: "Reading time", value: `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min` });
    facts.push({ label: "Words", value: String(words) });
  }
  if (language) facts.push({ label: "Language", value: language });

  const key = stripHash(url);
  return {
    url: key,
    kind: "page",
    key,
    site,
    title,
    author: author ?? (clean(readable?.byline).replace(/^by\s+/i, "") || undefined),
    publishedAt: published,
    thumbnail: image && /^https?:\/\//.test(image) ? image : undefined,
    facts,
    stats: [],
    description,
    body: { type: "paragraphs", paragraphs },
    note: paragraphs.length ? undefined : UNREADABLE,
    noteReason: paragraphs.length ? undefined : "unreadable",
    fetchedAt: now,
  };
}

/** Fetch and read a web page. The URL must already be validated and normalized. */
export async function loadPageLink(url: string, options: { signal?: AbortSignal }): Promise<LinkContext> {
  let response;
  try {
    response = await safeFetch(url, {
      signal: options.signal,
      accept: ["text/html", "application/xhtml+xml"],
      maxBytes: MAX_BYTES,
      timeoutMs: TIMEOUT_MS,
    });
  } catch (error) {
    if (error instanceof HttpError && [401, 402, 403, 429, 451].includes(error.status)) {
      throw new LinkLoadError(
        `${error.host} didn't let The Downloader read this page (HTTP ${error.status}). It may need a login or block apps — open it in your browser instead.`,
      );
    }
    throw error;
  }
  return parsePage(decodeHtml(response.body, response.contentType), response.url);
}
