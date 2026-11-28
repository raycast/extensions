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
const ACCESS = "This page needs a login or a subscription to read. Open it in your browser.";
/** A sign-in or subscribe address, where a site sends you instead of the page. */
const ACCESS_PATH = /(^|\/)(log-?in|sign-?in|sso|auth|subscribe|paywall)(\/|$)/i;

/**
 * True for a login or paywall page served with HTTP 200: the site's paywall
 * markup (schema.org `isAccessibleForFree: false`) or a sign-in or subscribe
 * address after redirects. A password field alone doesn't count — public pages
 * put sign-in boxes in their headers. Only asked when the page has no readable
 * text, so a metered paywall that sends the article is still read.
 */
function behindAccessWall(ld: Json[], url: string): boolean {
  if (ld.some((o) => String(o.isAccessibleForFree).toLowerCase() === "false")) return true;
  try {
    const { hostname, pathname } = new URL(url);
    return ACCESS_PATH.test(pathname) || /^(login|signin|accounts?|auth|sso)\./i.test(hostname);
  } catch {
    return false;
  }
}

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

/**
 * The article's text blocks, in reading order. Each block gives its own text —
 * what isn't inside a block nested in it — so nothing is read twice, and a
 * list item keeps its line when it also holds a nested list
 * (`<li>Fruits<ul><li>Apple</li></ul></li>`).
 */
function paragraphsOf(html: string): string[] {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const out: string[] = [];
  for (const block of document.querySelectorAll(BLOCKS)) {
    let own = "";
    for (const child of block.childNodes) {
      const element =
        child.nodeType === 1
          ? (child as unknown as { matches(selector: string): boolean; querySelector(selector: string): unknown })
          : undefined;
      // A nested block, or a wrapper around one, is read on its own turn.
      if (element && (element.matches(BLOCKS) || element.querySelector(BLOCKS))) own += " ";
      else own += child.textContent ?? "";
    }
    const text = clean(own);
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
  return readArticle(html, url, now).ctx;
}

/**
 * The page without what never holds its text: scripts (except JSON-LD, read
 * for the title and author), styles, inline SVG, templates and comments
 * (`<noscript>` stays: Readability takes lazy-loaded images from it). A
 * news page is often megabytes of these, and parsing them into a DOM and
 * walking it again in Readability froze the command for seconds.
 */
export function slimHtml(html: string): string {
  // Scripts before comments: a script can hold `<!--` as text.
  return html
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi, (whole, attrs: string) =>
      /application\/ld\+json/i.test(attrs) ? whole : "",
    )
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(style|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
}

/** Most elements Readability walks; a page past it (an endless feed) is read from its first part. */
const MAX_ELEMENTS = 30_000;

/**
 * Readability's article, or null. A document past `MAX_ELEMENTS` loses its
 * tail first: Readability itself would refuse it outright (`maxElemsToParse`)
 * and leave the page with no text at all.
 */
function parseReadable(document: Doc) {
  const all = document.querySelectorAll("body *");
  if (all.length > MAX_ELEMENTS) {
    for (let i = all.length - 1; i >= MAX_ELEMENTS; i--) {
      const el = all[i] as unknown as { remove(): void; isConnected?: boolean };
      if (el.isConnected !== false) el.remove();
    }
  }
  try {
    return new Readability(document as unknown as Document, { charThreshold: MIN_TEXT }).parse();
  } catch (error) {
    console.error("Readability couldn't read the page", error);
    return null;
  }
}

/** A page's context together with its article as HTML (Readability's output), for saving it as Markdown. */
export type PageArticle = { ctx: LinkContext; articleHtml: string };

/** `parsePage`, keeping the article's HTML. `articleHtml` is empty when the page has no readable text. */
export function readArticle(html: string, url: string, now = Date.now()): PageArticle {
  const { document } = parseHTML(slimHtml(html));
  // Metadata first: Readability rewrites the document it reads.
  const ld = jsonLd(document);
  const article = ld.find(isArticle);
  const site =
    metaContent(document, 'meta[property="og:site_name"]', 'meta[name="application-name"]') ??
    names((article?.publisher as Json | undefined)?.name) ??
    names(ld.find((o) => o["@type"] === "WebSite")?.name) ??
    hostOf(url);
  const documentTitle = clean(document.querySelector("title")?.textContent);
  const headline = typeof article?.headline === "string" ? clean(article.headline) : "";
  const ldName = typeof article?.name === "string" ? clean(article.name) : "";
  // Some sites (Wikipedia) put a one-line description in `headline` and the real
  // title in `name`: trust `name` when the page's own <title> starts with it.
  const namedByTitle = !!ldName && ldName !== headline && documentTitle.toLowerCase().startsWith(ldName.toLowerCase());
  const rawTitle =
    (namedByTitle ? ldName : headline) ||
    metaContent(document, 'meta[property="og:title"]', 'meta[name="twitter:title"]') ||
    documentTitle;
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
  const walled = behindAccessWall(ld, url);

  const readable = parseReadable(document);
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
  const ctx: LinkContext = {
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
    note: paragraphs.length ? undefined : walled ? ACCESS : UNREADABLE,
    noteReason: paragraphs.length ? undefined : walled ? "access" : "unreadable",
    fetchedAt: now,
  };
  return { ctx, articleHtml: paragraphs.length ? (readable?.content ?? "") : "" };
}

/** Fetch and read a web page. The URL must already be validated and normalized. */
export async function loadPageLink(url: string, options: { signal?: AbortSignal }): Promise<LinkContext> {
  return (await loadPageArticle(url, options)).ctx;
}

/** `loadPageLink`, keeping the article's HTML. */
export async function loadPageArticle(url: string, options: { signal?: AbortSignal }): Promise<PageArticle> {
  let response;
  try {
    response = await safeFetch(url, {
      signal: options.signal,
      accept: ["text/html", "application/xhtml+xml"],
      maxBytes: MAX_BYTES,
      timeoutMs: TIMEOUT_MS,
    });
  } catch (error) {
    // A login, a paywall or a legal block is the site's own decision: no archived copy is offered around it.
    if (error instanceof HttpError && error.status === 401) {
      throw new LinkLoadError(
        `${error.host} needs you to log in to read this page (HTTP 401). Open it in your browser.`,
      );
    }
    if (error instanceof HttpError && error.status === 402) {
      throw new LinkLoadError(`${error.host} asks for payment to read this page (HTTP 402). Open it in your browser.`);
    }
    if (error instanceof HttpError && error.status === 451) {
      throw new LinkLoadError(`${error.host} can't show this page where you are, for legal reasons (HTTP 451).`);
    }
    if (error instanceof HttpError && [403, 429].includes(error.status)) {
      throw new LinkLoadError(
        `${error.host} didn't let The Downloader read this page (HTTP ${error.status}). It may block apps — try the Internet Archive's copy, or open it in your browser.`,
        "archive",
      );
    }
    if (error instanceof HttpError && [404, 410].includes(error.status)) {
      throw new LinkLoadError(
        `This page is gone (HTTP ${error.status} from ${error.host}). The Internet Archive may have a saved copy.`,
        "archive",
      );
    }
    throw error;
  }
  return readArticle(decodeHtml(response.body, response.contentType), response.url);
}
