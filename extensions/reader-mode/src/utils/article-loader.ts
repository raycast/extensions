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

import { urlLog, paywallLog } from "./logger";
import { fetchHtml } from "./fetcher";
import { parseArticle, ArticleContent } from "./readability";
import { formatArticle } from "./markdown";
import { isBrowserExtensionAvailable, tryGetContentFromOpenTab } from "./browser-extension";
import { tryBypassPaywall, createArchiveSource, PaywallHopperResult } from "./paywall-hopper";
import { detectPaywall } from "./paywall-detector";
import { BrowserTab } from "../types/browser";
import { ArticleState } from "../types/article";

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
 * 2. Paywall re-detection — a bypass returning HTTP 200 is not a win: sites answer a crawler
 *    UA with the very paywall/challenge page they gate browsers with, and Readability extracts
 *    text from it just fine. Left unchecked, that page would be accepted and would suppress
 *    every later method (archive.is, Wayback) that might have the real article. So a candidate
 *    that is itself still paywalled is rejected and the waterfall continues. `html` is passed
 *    so the check includes the conclusive visible-barrier signal — a long teaser whose only
 *    tell is a visible `.paywall`/`[data-paywall]` overlay, with no gating text, is caught.
 *
 *    Memory: this parses a second DOM (inside `findVisibleBarrier`), but sequentially — the
 *    parse above has already returned strings and released its DOM. Measured on the largest
 *    real fixture (vanityfair, 1.5MB): the second DOM adds ~1MB and total stays ~5MB over
 *    baseline, far under the 100MB budget. The July heap regression was three DOMs built
 *    inside ONE parse, not two sequential ones.
 */
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
    if (detectPaywall({ textContent, html, description }, url).isPaywalled) {
      paywallLog.log("candidate:rejected", { url, reason: "still-paywalled", textLength: textContent.length });
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

  // Step 1: Fetch HTML
  progress("Fetching article…");
  const fetchResult = await fetchHtml(url);
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

  // Step 2.5: Check for soft paywall (200 OK but truncated/preview content)
  // Sites like NYTimes return 200 but serve preview content with paywall markers
  if (options.enablePaywallHopper) {
    // Weigh the HTML and the page's own description too, not just the extracted text:
    // the barrier markup and a body far shorter than its og:description are the signals
    // that catch paywalls on sites nobody thought to enumerate.
    const paywallCheck = detectPaywall(
      {
        textContent: parseResult.article.textContent,
        html: fetchResult.data.html,
        description: parseResult.article.description,
      },
      url,
    );

    if (paywallCheck.isPaywalled) {
      paywallLog.log("hopper:soft-paywall-detected", {
        url,
        score: paywallCheck.score,
        signals: paywallCheck.signals.map((s) => s.name),
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
        validateBypassCandidate(url, Math.floor(originalLength * 1.2)),
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
