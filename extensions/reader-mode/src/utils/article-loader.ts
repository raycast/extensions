/**
 * article-loader - Pure async utility for fetching and parsing articles
 *
 * This module handles all the "heavy lifting" of article extraction:
 * fetching HTML, parsing with Readability, paywall bypass, and Markdown conversion.
 * It is stateless and has no React dependencies.
 *
 * Responsibilities:
 * - Fetching HTML from URLs (via fetcher.ts)
 * - Parsing with Mozilla Readability (via readability.ts)
 * - Paywall bypass attempts (via paywall-hopper.ts)
 * - Browser tab fallback for blocked pages (via browser-extension.ts)
 * - Converting parsed content to Markdown (via markdown.ts)
 * - Returning discriminated union results for different outcomes
 *
 * Relationship to useArticleReader.ts:
 * - This module is consumed by the useArticleReader hook
 * - The hook manages React state; this module handles fetch/parse logic
 * - Returns LoadArticleResult which the hook interprets to update UI state
 *
 * @see src/hooks/useArticleReader.ts for the React state management layer
 */

import { ArticleState } from "../types/article";
import { BrowserTab } from "../types/browser";
import { isBrowserExtensionAvailable, tryGetContentFromOpenTab } from "./browser-extension";
import { fetchHtml } from "./fetcher";
import { paywallLog, urlLog } from "./logger";
import { dedupeArticleImage, formatArticle } from "./markdown";
import {
  componentTags,
  findMarkdownAlternate,
  isMarkdownPath,
  isMarkdownResponse,
  MarkdownArticle,
  pageHead,
  parseMarkdownArticle,
  proseText,
  stripPageChrome,
  trimToArticle,
} from "./markdown-source";
import { ExtractedMetadata, extractMetadata } from "./metadata-extractor";
import { detectPaywall, PaywallDetectionResult, UNLIMITED_ACCESS } from "./paywall-detector";
import { createArchiveSource, PaywallHopperResult, tryBypassPaywall } from "./paywall-hopper";
import { ArticleContent, parseArticle } from "./readability";

export type LoadArticleResult =
  | { status: "success"; article: ArticleState }
  | { status: "blocked"; url: string; hasBrowserExtension: boolean; foundTab: BrowserTab | null; error: string }
  | { status: "not-readable"; url: string; error: string }
  | { status: "empty-content"; url: string; error: string }
  | { status: "error"; error: string };

interface LoadArticleOptions {
  skipPreCheck: boolean;
  forceParse?: boolean;
  /** Whether Paywall Hopper is enabled (tries bypass methods on blocked pages) */
  enablePaywallHopper?: boolean;
  /** Whether to show the article image at the top (default: true) */
  showArticleImage?: boolean;
  /**
   * Reports what the loader is doing, so the UI can say so.
   * A paywall bypass tries several sources in turn and can run for a while.
   */
  onProgress?: (status: string) => void;
}

/**
 * Parses a bypass candidate and returns its article only if usable, for `tryBypassPaywall`.
 *
 * Two gates, cheapest first:
 *
 * 1. `minTextLength` — the soft-paywall case: the candidate must extract meaningfully more
 *    text than the preview we already have, or it isn't worth swapping in. A cheap length
 *    check on the raw HTML rejects hopeless candidates before paying for a parse — extracted
 *    text is a subset of the HTML, so HTML no longer than the bar can't possibly clear it. For
 *    the hard-block and direct paths there is no preview to beat, so `minTextLength` is 0.
 *
 * 2. Paywall re-detection. A bypass returning HTTP 200 is not a win: sites answer a crawler UA
 *    with the very paywall/challenge page they gate browsers with, and Readability extracts text
 *    from it fine. Left unchecked, that page is accepted and suppresses every later method
 *    (archive.is, Wayback) that might have the real article. But `detectPaywall` answers "is this
 *    page gated?", NOT "is this candidate usable?" — and those diverge, so the two conclusive
 *    signals are treated differently:
 *
 *    - **Gating phrases in the extracted text** ("subscribe to read", "already a subscriber?")
 *      are checked ALWAYS. They never appear in a genuine article body; they appear in teasers,
 *      challenge pages, and long subscription/upsell landing pages. This is what catches a long
 *      non-article response and keeps the waterfall going.
 *    - **The visible-barrier DOM element** (a `.paywall`/`[data-paywall]` overlay) is checked
 *      ONLY for short candidates (< `FULL_ARTICLE_TEXT_FLOOR`). Archives and client-gated sites
 *      (New Yorker, Wired) return the FULL article alongside a leftover overlay, so convicting a
 *      long extraction on the overlay alone discards a complete article and drops back to the
 *      truncated preview (or fails outright) — the Greptile failure class. For a short candidate
 *      the overlay may be the only tell of a phraseless teaser, so there it still counts.
 *
 *    Concretely: short candidates run `detectPaywall` WITH `html` (overlay + text signals); long
 *    candidates run it WITHOUT `html` (text signals only — no overlay, and no second DOM parse).
 *
 *    Memory: the short path parses a second DOM (inside `findVisibleBarrier`), but sequentially —
 *    the parse above has already returned strings and released its DOM. Measured on the largest
 *    real fixture (vanityfair, 1.5MB): the second DOM adds ~1MB, total ~5MB over baseline, far
 *    under the 100MB budget. (The long path skips it entirely.)
 */
// Below this many characters of extracted text, the visible-barrier DOM signal still counts (a
// short teaser's only tell may be its overlay). At or above it, there is a real article's worth
// of text: the overlay is ignored (a full article can carry a leftover one) and only gating
// phrases in the text can still reject. Set clear of teaser range (a subscribe/challenge body is
// a few hundred to ~1500 chars) and clear of the visible-barrier teaser at test:490 (~1580).
const FULL_ARTICLE_TEXT_FLOOR = 2000;

function validateBypassCandidate(url: string, minTextLength: number): (html: string) => ArticleContent | null {
  return (html: string) => {
    // Each rejection logs its reason: the caller (tryBypassPaywall) only records *that* a
    // candidate was rejected, so without this "why did every candidate fail on site X" is
    // unanswerable from the logs — the gap the soft-paywall refactor introduced.
    if (html.length <= minTextLength) {
      paywallLog.log("candidate:rejected", {
        url,
        reason: "html-shorter-than-bar",
        htmlLength: html.length,
        minTextLength,
      });
      return null;
    }
    const parsed = parseArticle(html, url, { skipPreCheck: true, forceParse: true });
    if (!parsed.success) {
      paywallLog.log("candidate:rejected", { url, reason: "parse-failed", error: parsed.error.message });
      return null;
    }
    const { textContent, description } = parsed.article;
    if (textContent.length <= minTextLength) {
      paywallLog.log("candidate:rejected", {
        url,
        reason: "text-shorter-than-bar",
        textLength: textContent.length,
        minTextLength,
      });
      return null;
    }
    // Short candidates: overlay DOM + text signals. Long: text signals only (a full article can
    // carry a leftover overlay; a gating phrase in the body cannot). See the doc comment above.
    // An article recovered from the page's data payload is weighed on its text too: the page's
    // overlay describes the teaser the payload got past.
    const isShort = textContent.length < FULL_ARTICLE_TEXT_FLOOR && !parsed.article.recoveredFromPayload;
    const evidence = isShort ? { textContent, html, description } : { textContent, description };
    if (detectPaywall(evidence, url).isPaywalled) {
      paywallLog.log("candidate:rejected", {
        url,
        reason: "still-paywalled",
        textLength: textContent.length,
        checked: isShort ? "overlay+text" : "text-only",
      });
      return null;
    }
    return parsed.article;
  };
}

/**
 * Builds the success result for a bypassed article from an already-parsed candidate.
 *
 * Takes the `ArticleContent` the validator already produced, so the winning candidate is
 * never parsed a second time. Shared by all three bypass call sites, which otherwise
 * rebuilt this identically.
 */
function buildBypassArticle(
  article: ArticleContent,
  hopperResult: PaywallHopperResult,
  url: string,
  source: string,
  showArticleImage: boolean | undefined,
): { article: ArticleState; markdownLength: number } {
  const archiveSource = createArchiveSource(hopperResult);
  const formatted = formatArticle(article.title, article.content, {
    image: showArticleImage !== false ? article.image : null,
    archiveSource: archiveSource
      ? { service: archiveSource.service, url: archiveSource.url, timestamp: archiveSource.timestamp }
      : undefined,
  });

  return {
    article: {
      bodyMarkdown: formatted.markdown,
      title: article.title,
      byline: article.byline,
      siteName: article.siteName,
      url,
      source,
      textContent: article.textContent,
      bypassedReadabilityCheck: true,
      archiveSource,
    },
    markdownLength: formatted.markdown.length,
  };
}

const MIN_MARKDOWN_TEXT_LENGTH = 200;

/**
 * The share of the HTML article's text the Markdown must hold to count as the whole article. On
 * pages that send both, the Markdown held 106% to 934% of what Readability extracts from the HTML
 * (seven Cloudflare, Stripe, Vercel, and Anthropic pages, 2026-10-26), so falling below this
 * means the Markdown is an excerpt.
 */
const MARKDOWN_COVERAGE = 0.8;

/**
 * Past this many elements, a page isn't parsed just to judge the Markdown version it links to:
 * its DOM would outgrow Raycast's 100 MB heap (100,000 paragraphs took 141 MB). Real articles hold
 * far fewer: 300 to 3,300 on seven documentation pages and six news captures (2026-10-26).
 */
const MAX_JUDGED_ELEMENTS = 20_000;

/** True when `html` opens more than `limit` elements, counted without parsing it. */
function hasMoreElements(html: string, limit: number): boolean {
  let count = 0;
  for (let i = html.indexOf("<"); i !== -1; i = html.indexOf("<", i + 1)) {
    const next = html.charCodeAt(i + 1);
    // An opening tag starts with a letter: not "</", "<!", or a stray "<" in text.
    if ((next | 32) >= 97 && (next | 32) <= 122 && ++count > limit) return true;
  }
  return false;
}

/** The bar a Paywall Hopper candidate must clear: 20% more text than the teaser it replaces. */
const BEATS_TEASER = 1.2;

const MAX_COMPONENT_TAGS = 1;

/** Text length with runs of whitespace counted once, so HTML's indentation doesn't count as text. */
function textLength(text: string): number {
  return text.replace(/\s+/g, " ").trim().length;
}

/**
 * Whether the parsed page is paywalled. Weighs the HTML and the page's own description too, not
 * just the extracted text: the barrier markup and a body far shorter than its og:description are
 * the signals that catch paywalls on sites nobody thought to enumerate. When the article came from
 * the page's data payload, the barrier markup describes the teaser this parse got past, so only
 * the recovered text is weighed.
 */
function detectPagePaywall(article: ArticleContent, html: string, url: string): PaywallDetectionResult {
  return detectPaywall(
    {
      textContent: article.textContent,
      html: article.recoveredFromPayload ? undefined : html,
      description: article.description,
    },
    url,
  );
}

type MarkdownReason = "too-short" | "paywalled" | "no-html" | "components" | "html-paywalled" | "partial" | "markdown";

/**
 * Decides whether a page's Markdown (sent for `Accept: text/markdown`, or the version the page
 * links to) reads better than the article Reader extracts from the same page's HTML. `page` is
 * that HTML and its parse, or null when the HTML couldn't be fetched or parsed; its `paywallCheck`,
 * when given, supplies the page's paywall verdict so a caller that needs it too checks only once.
 * Each rule passes
 * over the Markdown for a reason it names, which is logged:
 *
 * - `too-short`: almost no text, so a broken or empty conversion.
 * - `paywalled`: its prose says it is withholding the story ("unlimited access" counts only in a
 *   teaser-length Markdown, since a product page says it too).
 * - `no-html`: taken. With nothing to compare against, it is the only article there is.
 * - `components`: MDX components (`<Steps>`, `<Card>`), which Raycast shows as markup.
 * - `html-paywalled`: the HTML page is paywalled. Reading the HTML lets the Paywall Hopper look
 *   for the full article first: a converter turns the teaser page into Markdown along with its
 *   menus and footer, so Markdown longer than the teaser is no sign that it holds the story. The
 *   loader shows the Markdown only if it holds 20% more text than the teaser and than whatever
 *   the Hopper found.
 * - `partial`: less text than the HTML article, so an excerpt of it.
 * - `markdown`: taken. As complete as the HTML, and already clean.
 */
export function judgeMarkdown(
  markdown: MarkdownArticle,
  page: { article: ArticleContent; html: string; paywallCheck?: () => PaywallDetectionResult } | null,
  url: string,
): { useMarkdown: boolean; reason: MarkdownReason } {
  const length = textLength(markdown.textContent);
  if (length < MIN_MARKDOWN_TEXT_LENGTH) return { useMarkdown: false, reason: "too-short" };
  // Its prose only: a code example quoting "Unlimited access" isn't the page withholding the story.
  // Markdown past teaser length (its text, code included) may say "unlimited access" about a
  // product, so there that phrase alone doesn't count; "subscribe to continue reading" still does.
  const prose = proseText(markdown.body);
  const evidence =
    length < FULL_ARTICLE_TEXT_FLOOR ? prose : prose.replace(new RegExp(UNLIMITED_ACCESS.source, "gi"), "");
  if (detectPaywall({ textContent: evidence }, url).isPaywalled) {
    return { useMarkdown: false, reason: "paywalled" };
  }
  if (!page) return { useMarkdown: true, reason: "no-html" };
  if (componentTags(markdown.body) > MAX_COMPONENT_TAGS) return { useMarkdown: false, reason: "components" };

  const { article, html, paywallCheck = () => detectPagePaywall(article, html, url) } = page;
  if (paywallCheck().isPaywalled) return { useMarkdown: false, reason: "html-paywalled" };
  if (length < textLength(article.textContent) * MARKDOWN_COVERAGE) return { useMarkdown: false, reason: "partial" };
  return { useMarkdown: true, reason: "markdown" };
}

/** What the HTML page says about itself, for an article read from its Markdown. */
type PageMeta = Pick<ExtractedMetadata, "title" | "author" | "siteName" | "image">;

/**
 * The title, author, site name, and image from the page's `<head>`, parsing only the `<head>`: a
 * long page's DOM runs to tens of MB. Null when the head can't be read.
 */
function headMeta(html: string, url: string): PageMeta | null {
  try {
    return extractMetadata(`${pageHead(html)}</head><body></body>`, url);
  } catch {
    return null;
  }
}

/**
 * Builds the article from Markdown: a `.md` URL opened directly, a page's Markdown alternate, or
 * the Markdown a page sent when asked for it. `markdown` is the text, or the article already
 * parsed from it. `meta` is what the HTML page says about itself, which supplies the title, site
 * name, author, and image ahead of the Markdown's own title.
 */
function buildMarkdownArticle(
  markdown: string | MarkdownArticle,
  markdownUrl: string,
  url: string,
  source: string,
  showArticleImage: boolean | undefined,
  meta?: PageMeta | null,
): ArticleState {
  const parsed = typeof markdown === "string" ? parseMarkdownArticle(markdown, markdownUrl) : markdown;

  let bodyMarkdown = parsed.body;
  const image = showArticleImage !== false ? meta?.image : null;
  if (image) bodyMarkdown = `![](${image})\n\n${dedupeArticleImage(bodyMarkdown, image)}`;

  return {
    bodyMarkdown,
    title: meta?.title || parsed.title || fileTitle(markdownUrl) || "Untitled",
    byline: meta?.author ?? null,
    siteName: meta?.siteName ?? null,
    url,
    source,
    textContent: parsed.textContent,
  };
}

/** "…/my-notes.md" → "my-notes". */
function fileTitle(url: string): string {
  let name = new URL(url).pathname.split("/").pop() ?? "";
  try {
    name = decodeURIComponent(name);
  } catch {
    // Malformed percent-encoding: keep the name as written
  }
  return name.replace(/\.(?:md|markdown)$/i, "");
}

/**
 * Fetches the Markdown alternate a page advertises. Null if it is missing or isn't Markdown (a
 * catch-all route answering with the app's HTML shell); the caller then reads the HTML page as
 * usual.
 */
async function fetchMarkdownAlternate(alternateUrl: string): Promise<{ raw: string; url: string } | null> {
  const result = await fetchHtml(alternateUrl);
  if (!result.success) {
    urlLog.log("markdown-alternate:fallback", { alternateUrl, reason: result.error.message });
    return null;
  }
  const { html: raw, url, contentType } = result.data;
  if (!isMarkdownResponse(contentType, url, raw)) {
    urlLog.log("markdown-alternate:fallback", { alternateUrl, reason: "not-markdown", contentType });
    return null;
  }
  return { raw, url };
}

/**
 * Markdown that competes with the page's HTML: sent when asked for (`negotiated`) or linked from
 * the page (`alternate`). `raw` is kept so the page's own JSON-LD can be recognized once its HTML
 * is in hand; `text` (chrome stripped without it) and `markdown` are for when it isn't.
 */
interface MarkdownCandidate {
  raw: string;
  text: string;
  markdown: MarkdownArticle;
  url: string;
  from: "negotiated" | "alternate";
}

/** Where an article read from Markdown came from, as logged: a `.md` link, or a candidate. */
type MarkdownSource = "direct" | MarkdownCandidate["from"];

function markdownCandidate(raw: string, url: string, from: MarkdownCandidate["from"]): MarkdownCandidate {
  const text = stripPageChrome(raw, url);
  return { raw, text, markdown: parseMarkdownArticle(text, url), url, from };
}

/**
 * Loads and parses an article from a URL.
 * Handles fetch, parse, and format steps with proper error handling.
 */
export async function loadArticleFromUrl(
  url: string,
  source: string,
  options: LoadArticleOptions,
): Promise<LoadArticleResult> {
  urlLog.log("session:url-resolved", { url, source });

  const progress = options.onProgress ?? (() => {});

  /** The success result for an article read from Markdown, logged as such. */
  const showMarkdown = (
    markdown: string | MarkdownArticle,
    markdownUrl: string,
    from: MarkdownSource,
    meta?: PageMeta | null,
  ): LoadArticleResult => {
    const article = buildMarkdownArticle(markdown, markdownUrl, url, source, options.showArticleImage, meta);
    urlLog.log("session:ready", {
      url,
      title: article.title,
      markdownLength: article.bodyMarkdown.length,
      markdown: from,
    });
    return { status: "success", article };
  };

  /**
   * The candidate's Markdown when there is no HTML to compare it with (the page couldn't be
   * fetched or parsed, or is too large to parse), or null when it falls short. `meta` reads what
   * the page says about itself, if that can be trusted.
   */
  const showWithoutPage = (
    candidate: MarkdownCandidate,
    htmlError: string,
    meta: () => PageMeta | null = () => null,
  ): LoadArticleResult | null => {
    const verdict = judgeMarkdown(candidate.markdown, null, url);
    urlLog.log("markdown:verdict", { url, from: candidate.from, ...verdict, htmlError });
    return verdict.useMarkdown ? showMarkdown(candidate.markdown, candidate.url, candidate.from, meta()) : null;
  };

  // Step 1: Fetch the page, asking for Markdown first.
  progress("Fetching article…");
  let fetchResult = await fetchHtml(url, { preferMarkdown: true });
  // A server that can't send Markdown should ignore the request, but one that refuses it instead
  // (406 Not Acceptable, 415 Unsupported Media Type) gets asked again for the HTML.
  if (!fetchResult.success && [406, 415].includes(fetchResult.error.statusCode ?? 0)) {
    urlLog.log("markdown-negotiated:refused", { url, statusCode: fetchResult.error.statusCode });
    fetchResult = await fetchHtml(url);
  }

  // A server that sent Markdown because it was asked for it serves the page as HTML too. Fetch
  // that as well, so the two can be compared once the HTML is parsed. A link to a `.md` file that
  // stays one is Markdown whatever is asked for, so it is read below as it always was. A page
  // that redirected to a `.md` file only because Markdown was asked for, or an old `.md` link
  // that now redirects to a page, is compared like any other.
  let candidate: MarkdownCandidate | null = null;
  if (
    fetchResult.success &&
    !(isMarkdownPath(url) && isMarkdownPath(fetchResult.data.url)) &&
    isMarkdownResponse(fetchResult.data.contentType, fetchResult.data.url, fetchResult.data.html)
  ) {
    candidate = markdownCandidate(fetchResult.data.html, fetchResult.data.url, "negotiated");
    urlLog.log("markdown-negotiated:found", { url, textLength: candidate.markdown.textContent.length });
    progress("Fetching the web page to compare…");
    const page = await fetchHtml(url);
    if (!page.success) {
      const shown = showWithoutPage(candidate, page.error.message);
      if (shown) return shown;
    } else if (isMarkdownResponse(page.data.contentType, page.data.url, page.data.html)) {
      // Markdown again, though HTML was asked for: the page is only Markdown, read below.
      candidate = null;
    }
    fetchResult = page;
  }

  if (!fetchResult.success) {
    // Check if this is a blocked error (401, 403, 429, 451) that could be resolved
    if (fetchResult.error.type === "blocked") {
      // First, try automatic fallback: check if URL is already open in a browser tab
      const browserResult = await tryGetContentFromOpenTab(url);

      if (browserResult.status === "success") {
        urlLog.log("fetch:auto-fallback-success", { url });
        return { status: "success", article: browserResult.article };
      }

      // If Paywall Hopper is enabled, try bypass methods before showing blocked view
      if (options.enablePaywallHopper) {
        paywallLog.log("hopper:blocked-page-detected", { url, statusCode: fetchResult.error.statusCode });

        progress("Page is blocked — trying Paywall Hopper…");
        // The original fetch was a hard block (401/403/429/451): no content at all, so any
        // page that parses is an improvement. minTextLength = 0.
        const hopperResult = await tryBypassPaywall(url, progress, validateBypassCandidate(url, 0));

        if (hopperResult.success && hopperResult.validated) {
          paywallLog.log("hopper:bypass-success", {
            url,
            source: hopperResult.source,
            archiveUrl: hopperResult.archiveUrl,
          });

          const built = buildBypassArticle(hopperResult.validated, hopperResult, url, source, options.showArticleImage);

          urlLog.log("session:ready", {
            url,
            title: built.article.title,
            markdownLength: built.markdownLength,
            bypassedCheck: true,
            archiveSource: hopperResult.source,
          });

          return { status: "success", article: built.article };
        }
      }

      if (browserResult.status === "fetch_failed") {
        // Tab exists but we couldn't get content (likely inactive tab timeout)
        urlLog.log("fetch:tab-found-but-failed", {
          url,
          tabId: browserResult.tab.id,
          tabTitle: browserResult.tab.title,
          isActive: browserResult.tab.active,
        });
        return {
          status: "blocked",
          url,
          hasBrowserExtension: true,
          foundTab: browserResult.tab,
          error: fetchResult.error.message,
        };
      }

      // Tab not found - show manual browser extension flow
      const extensionAvailable = isBrowserExtensionAvailable();
      urlLog.log(extensionAvailable ? "fetch:blocked-with-extension" : "fetch:blocked-no-extension", { url });
      return {
        status: "blocked",
        url,
        hasBrowserExtension: extensionAvailable,
        foundTab: null,
        error: fetchResult.error.message,
      };
    }

    return { status: "error", error: fetchResult.error.message };
  }

  // Step 1.5: Markdown. A .md URL is read as Markdown, never as HTML. The Markdown version a page
  // links to becomes the candidate the HTML is compared with below, unless the page already sent
  // Markdown when asked: that is the same document (Cloudflare's and Anthropic's docs serve the
  // same file both ways), so it isn't fetched twice.
  const { html, url: finalUrl, contentType } = fetchResult.data;
  if (isMarkdownResponse(contentType, finalUrl, html)) return showMarkdown(html, finalUrl, "direct");

  // A page that sent Markdown and then failed to parse may be a login or challenge page, not the
  // article, so its <head> isn't used for the title and image. A page that links its Markdown
  // version is the publisher's, and its <head> describes the article.
  const trustedHead = (candidate: MarkdownCandidate) => () =>
    candidate.from === "alternate" ? headMeta(html, finalUrl) : null;
  if (!candidate) {
    const alternateUrl = findMarkdownAlternate(html, finalUrl);
    if (alternateUrl && alternateUrl !== finalUrl) {
      progress("Fetching the Markdown version…");
      urlLog.log("markdown-alternate:found", { url, alternateUrl });
      const alternate = await fetchMarkdownAlternate(alternateUrl);
      if (alternate) candidate = markdownCandidate(alternate.raw, alternate.url, "alternate");
    }
  }

  // Too large to parse just for the comparison: the Markdown stands in for the page, as long as it
  // has text and doesn't say it is withholding the story. Otherwise the page parses as before.
  if (candidate && hasMoreElements(html, MAX_JUDGED_ELEMENTS)) {
    const shown = showWithoutPage(candidate, "page too large to compare", trustedHead(candidate));
    if (shown) return shown;
    candidate = null;
  }

  // Step 2: Parse with Readability
  // When skipPreCheck is true (from "Try Anyway"), also enable forceParse
  const forceParse = options.forceParse ?? options.skipPreCheck;
  urlLog.log("parse:start", { url, skipPreCheck: options.skipPreCheck, forceParse });
  progress("Extracting article…");
  const parseResult = parseArticle(fetchResult.data.html, fetchResult.data.url, {
    skipPreCheck: options.skipPreCheck,
    forceParse,
  });
  if (!parseResult.success) {
    urlLog.error("parse:failed", { url, errorType: parseResult.error.type, message: parseResult.error.message });

    if (candidate) {
      const shown = showWithoutPage(candidate, parseResult.error.message, trustedHead(candidate));
      if (shown) return shown;
    }

    // Try browser tab fallback when parsing fails (page might render differently in browser)
    const browserResult = await tryGetContentFromOpenTab(url);
    if (browserResult.status === "success") {
      urlLog.log("parse:browser-fallback-success", { url });
      return { status: "success", article: browserResult.article };
    }

    if (parseResult.error.type === "not-readable") {
      return { status: "not-readable", url, error: parseResult.error.message };
    }
    if (parseResult.error.type === "empty-content" || parseResult.error.type === "parse-failed") {
      return { status: "empty-content", url, error: parseResult.error.message };
    }
    return { status: "error", error: parseResult.error.message };
  }
  urlLog.log("parse:success", { url, contentLength: parseResult.article.content.length });

  // Step 2.25: Show the page's Markdown instead, if it reads better than this article. First cut
  // it down to the article this parse found, without the page around it that a converter keeps.
  // Held back when the page is paywalled, so the Paywall Hopper runs first (Step 3.5).
  let paywallCheck: PaywallDetectionResult | undefined;
  const checkPaywall = () => (paywallCheck ??= detectPagePaywall(parseResult.article, html, url));
  let paywalled: { candidate: MarkdownCandidate; markdown: MarkdownArticle } | null = null;
  if (candidate) {
    const text = stripPageChrome(candidate.raw, candidate.url, html);
    const trimmed = trimToArticle(text, parseResult.article.textContent, parseResult.article.content);
    const markdown = trimmed === candidate.text ? candidate.markdown : parseMarkdownArticle(trimmed, candidate.url);
    const verdict = judgeMarkdown(markdown, { article: parseResult.article, html, paywallCheck: checkPaywall }, url);
    urlLog.log("markdown:verdict", {
      url,
      from: candidate.from,
      ...verdict,
      trimmed: trimmed !== text,
      markdownLength: markdown.textContent.length,
      htmlLength: parseResult.article.textContent.length,
    });
    if (verdict.useMarkdown) return showMarkdown(markdown, candidate.url, candidate.from, headMeta(html, finalUrl));
    if (verdict.reason === "html-paywalled") paywalled = { candidate, markdown };
  }

  /**
   * The paywalled page's Markdown, when it holds 20% more text than `text`: the teaser, or the
   * copy the Paywall Hopper found, which only had to beat the teaser. Null otherwise.
   */
  const markdownOver = (text: string, hopperSource?: string): LoadArticleResult | null => {
    if (!paywalled || textLength(paywalled.markdown.textContent) <= textLength(text) * BEATS_TEASER) return null;
    const { candidate, markdown } = paywalled;
    urlLog.log("markdown:beats-teaser", { url, from: candidate.from, ...(hopperSource && { over: hopperSource }) });
    return showMarkdown(markdown, candidate.url, candidate.from, headMeta(html, finalUrl));
  };

  // Step 2.5: Check for soft paywall (200 OK but truncated/preview content)
  // Sites like NYTimes return 200 but serve preview content with paywall markers
  if (options.enablePaywallHopper) {
    const check = checkPaywall();
    if (check.isPaywalled) {
      paywallLog.log("hopper:soft-paywall-detected", {
        url,
        score: check.score,
        signals: check.signals.map((s) => s.name),
        originalContentLength: parseResult.article.textContent.length,
      });

      // Try to get full content via Paywall Hopper. Each candidate must extract at least
      // 20% more text than this preview, or the waterfall rejects it and tries the next
      // method — so a bypass that merely re-serves the preview can't end the search.
      const originalLength = parseResult.article.textContent.length;
      progress("Paywall detected — trying Paywall Hopper…");
      const hopperResult = await tryBypassPaywall(
        url,
        progress,
        // floor, with the validator's `<=` reject, preserves the old strict `> originalLength * 1.2`.
        validateBypassCandidate(url, Math.floor(originalLength * BEATS_TEASER)),
      );

      if (hopperResult.success && hopperResult.validated) {
        const bypassed = hopperResult.validated;
        paywallLog.log("hopper:soft-paywall-bypassed", {
          url,
          source: hopperResult.source,
          originalLength,
          bypassedLength: bypassed.textContent.length,
          improvement: `${Math.round((bypassed.textContent.length / originalLength - 1) * 100)}%`,
        });

        const fuller = markdownOver(bypassed.textContent, hopperResult.source);
        if (fuller) return fuller;

        const built = buildBypassArticle(bypassed, hopperResult, url, source, options.showArticleImage);

        urlLog.log("session:ready", {
          url,
          title: built.article.title,
          markdownLength: built.markdownLength,
          bypassedCheck: true,
          archiveSource: hopperResult.source,
        });

        return { status: "success", article: built.article };
      }
      // No method beat the preview by enough: continue with the original content.
      paywallLog.log("hopper:soft-paywall-fallback", { url });
    }
  }

  // Step 3.5: The page is paywalled and the Paywall Hopper found nothing better (or is off).
  const overTeaser = markdownOver(parseResult.article.textContent);
  if (overTeaser) return overTeaser;

  // Step 3: Convert to Markdown
  urlLog.log("markdown:start", { url, hasImage: !!parseResult.article.image, imageUrl: parseResult.article.image });
  const formatted = formatArticle(parseResult.article.title, parseResult.article.content, {
    image: options.showArticleImage !== false ? parseResult.article.image : null,
  });
  urlLog.log("markdown:complete", { url, markdownLength: formatted.markdown.length });

  urlLog.log("session:ready", {
    url,
    title: formatted.title,
    markdownLength: formatted.markdown.length,
  });

  const article: ArticleState = {
    bodyMarkdown: formatted.markdown,
    title: parseResult.article.title,
    byline: parseResult.article.byline,
    siteName: parseResult.article.siteName,
    url,
    source,
    textContent: parseResult.article.textContent,
  };

  return { status: "success", article };
}

/**
 * Attempts to load an article directly via Paywall Hopper bypass methods.
 * Used when initial fetch fails readability check but the site is known to be paywalled.
 */
export async function loadArticleViaPaywallHopper(
  url: string,
  options: {
    showArticleImage?: boolean;
    onProgress?: (status: string) => void;
  },
): Promise<LoadArticleResult> {
  paywallLog.log("hopper:direct-attempt", { url });

  // No original content here (the site is known paywalled), so any page that parses beats
  // nothing. The validator parses in the waterfall; a candidate that fails to parse is
  // rejected and the next method tried, rather than ending the search.
  const hopperResult = await tryBypassPaywall(url, options.onProgress, validateBypassCandidate(url, 0));

  if (!hopperResult.success || !hopperResult.validated) {
    paywallLog.log("hopper:direct-failed", { url, error: hopperResult.error });
    return {
      status: "error",
      error: hopperResult.error || "Failed to retrieve content via Paywall Hopper",
    };
  }

  paywallLog.log("hopper:direct-success", {
    url,
    source: hopperResult.source,
    archiveUrl: hopperResult.archiveUrl,
  });

  const built = buildBypassArticle(
    hopperResult.validated,
    hopperResult,
    url,
    "paywall-hopper",
    options.showArticleImage,
  );

  urlLog.log("session:ready", {
    url,
    title: built.article.title,
    markdownLength: built.markdownLength,
    bypassedCheck: true,
    archiveSource: hopperResult.source,
  });

  return { status: "success", article: built.article };
}
