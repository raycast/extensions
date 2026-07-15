/**
 * Browser Extension Utilities
 *
 * Handles all interactions with the Raycast browser extension for fetching
 * content from open browser tabs. Used as a fallback when direct HTTP fetch
 * fails (e.g., 403 blocked pages).
 */

import { BrowserExtension } from "@raycast/api";
import { urlLog } from "./logger";
import { parseArticle } from "./readability";
import { formatArticle } from "./markdown";
import { getBrowserTabsSafe, hasBrowserExtension, withTimeout } from "./host-api";
import { BrowserTab, BrowserContentResult, TabContentResult } from "../types/browser";
import { ArticleState } from "../types/article";

/**
 * Check if the browser extension is available.
 *
 * Answered locally via `environment.canAccess` — no IPC. The API is unavailable
 * on Windows entirely, and probing it by calling `getTabs()` and seeing whether it
 * threw cost a full round-trip that could exceed Raycast's 5s request timeout.
 */
export function isBrowserExtensionAvailable(): boolean {
  return hasBrowserExtension();
}

/**
 * Get all open browser tabs.
 * Returns an empty array if the extension is unavailable or the host does not respond.
 */
export async function getBrowserTabs(): Promise<BrowserTab[]> {
  return getBrowserTabsSafe();
}

/** Budget for transferring a full page's HTML from a tab (larger than a metadata call). */
const TAB_CONTENT_TIMEOUT_MS = 4000;

/**
 * Fetch tab content, bounded so an unresponsive host cannot hang the command.
 */
async function getContentSafe(options: { format: "html"; tabId?: number }): Promise<string | null> {
  if (!hasBrowserExtension()) return null;
  return withTimeout(() => BrowserExtension.getContent(options), null, TAB_CONTENT_TIMEOUT_MS, "getContent");
}

/**
 * Normalize URL for comparison (strips trailing slashes, lowercases hostname)
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, "")}${parsed.search}`;
  } catch {
    return url;
  }
}

/**
 * Extract canonical URL from HTML content.
 * Checks og:url, twitter:url, and link[rel="canonical"] in that order.
 */
function extractCanonicalUrl(html: string): string | null {
  // Try og:url
  const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
  if (ogUrlMatch?.[1]) return ogUrlMatch[1];

  // Try twitter:url
  const twitterUrlMatch = html.match(/<meta[^>]+(?:property|name)=["']twitter:url["'][^>]+content=["']([^"']+)["']/i);
  if (twitterUrlMatch?.[1]) return twitterUrlMatch[1];

  // Try link[rel="canonical"]
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (canonicalMatch?.[1]) return canonicalMatch[1];

  // Also check reverse attribute order for link tag
  const canonicalMatchReverse = html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (canonicalMatchReverse?.[1]) return canonicalMatchReverse[1];

  return null;
}

/**
 * Check if two URLs match, considering canonical URLs.
 * Returns true if either URL matches directly or via canonical.
 */
export function urlsMatch(targetUrl: string, tabUrl: string, tabHtml?: string): boolean {
  const normalizedTarget = normalizeUrl(targetUrl);
  const normalizedTab = normalizeUrl(tabUrl);

  // Direct match
  if (normalizedTarget === normalizedTab) {
    return true;
  }

  // Check canonical URL from tab HTML if provided
  if (tabHtml) {
    const canonicalUrl = extractCanonicalUrl(tabHtml);
    if (canonicalUrl) {
      const normalizedCanonical = normalizeUrl(canonicalUrl);
      if (normalizedTarget === normalizedCanonical) {
        urlLog.log("url:canonical-match", { targetUrl, tabUrl, canonicalUrl });
        return true;
      }
    }
  }

  return false;
}

/**
 * Find a tab matching the given URL.
 * Compares normalized URLs to handle minor differences.
 */
export async function findTabByUrl(targetUrl: string): Promise<BrowserTab | null> {
  const tabs = await getBrowserTabs();
  if (tabs.length === 0) return null;

  const normalizedTarget = normalizeUrl(targetUrl);
  return tabs.find((tab) => normalizeUrl(tab.url) === normalizedTarget) ?? null;
}

/**
 * Result from reimport attempt.
 * Includes tab info so UI can prompt user to focus the tab if needed.
 */
export type ReimportResult =
  | { status: "success"; article: ArticleState }
  | { status: "no_matching_tab" }
  | { status: "tab_inactive"; tab: BrowserTab }
  | { status: "error"; error: string };

/**
 * Reimport article content from browser tab.
 * Validates that the tab URL matches the target URL (including canonical URL check).
 * Returns tab_inactive status if tab exists but is not focused (browser may have unloaded it).
 *
 * Window priority: The browser extension API marks tabs as "active" per-window, meaning
 * multiple tabs can be "active" if multiple windows are open. We prioritize the focused
 * window by first checking if the focused window's active tab matches the URL.
 */
export async function reimportFromBrowserTab(targetUrl: string): Promise<ReimportResult> {
  const tabs = await getBrowserTabs();
  if (tabs.length === 0) {
    urlLog.log("reimport:no-tabs", { targetUrl });
    return { status: "no_matching_tab" };
  }

  const normalizedTarget = normalizeUrl(targetUrl);
  const activeTabs = tabs.filter((tab) => tab.active);

  // Step 1: Identify the focused window's active tab.
  //
  // The extension marks one tab active *per window*, so with several windows open
  // we disambiguate by fetching content with no tabId — which the host serves from
  // the focused window — and matching it against a candidate's content.
  //
  // Only tabs that already match the target URL can win, so we compare against those
  // alone. Comparing against every active tab meant one full-page HTML transfer per
  // window, each a multi-megabyte string and a chance to blow the host's 5s budget.
  let focusedWindowTabId: number | null = null;

  if (activeTabs.length === 1) {
    focusedWindowTabId = activeTabs[0].id;
  } else if (activeTabs.length > 1) {
    const candidates = activeTabs.filter((tab) => normalizeUrl(tab.url) === normalizedTarget);

    if (candidates.length === 1) {
      // Exactly one active tab holds this URL — no need to ask the host which window is focused.
      focusedWindowTabId = candidates[0].id;
    } else if (candidates.length > 1) {
      const focusedContent = await getContentSafe({ format: "html" });

      for (const candidate of candidates) {
        const tabContent = await getContentSafe({ format: "html", tabId: candidate.id });
        if (tabContent && tabContent === focusedContent) {
          focusedWindowTabId = candidate.id;
          urlLog.log("reimport:focused-window-identified", { tabId: candidate.id, tabUrl: candidate.url });
          break;
        }
      }
    }
  }

  // Step 2: Find the matching tab, preferring the focused window.
  const focusedTab = focusedWindowTabId ? tabs.find((tab) => tab.id === focusedWindowTabId) : undefined;

  let matchingTab: BrowserTab | undefined;

  if (focusedTab && normalizeUrl(focusedTab.url) === normalizedTarget) {
    matchingTab = focusedTab;
    urlLog.log("reimport:matched-focused-window", { targetUrl, tabId: focusedTab.id });
  } else {
    matchingTab = tabs.find((tab) => normalizeUrl(tab.url) === normalizedTarget);
  }

  // No direct URL match — the focused tab may still be the article under a canonical URL.
  if (!matchingTab && focusedTab) {
    const html = await getContentSafe({ format: "html", tabId: focusedTab.id });
    if (html && urlsMatch(targetUrl, focusedTab.url, html)) {
      matchingTab = focusedTab;
      urlLog.log("reimport:canonical-match-found", { targetUrl, tabUrl: focusedTab.url });
    }
  }

  if (!matchingTab) {
    urlLog.log("reimport:no-matching-tab", { targetUrl });
    return { status: "no_matching_tab" };
  }

  const isInFocusedWindow = matchingTab.id === focusedWindowTabId;
  urlLog.log("reimport:found-tab", {
    targetUrl,
    tabId: matchingTab.id,
    tabUrl: matchingTab.url,
    isActive: matchingTab.active,
    isInFocusedWindow,
  });

  // If tab is not active OR not in the focused window, return status so UI can prompt user
  if (!matchingTab.active || !isInFocusedWindow) {
    return { status: "tab_inactive", tab: matchingTab };
  }

  // Tab is active and in focused window, fetch content
  const result = await getContentFromTab(targetUrl, matchingTab.id);
  if (result.success) {
    urlLog.log("reimport:success", { targetUrl, source: "browser-tab" });
    return { status: "success", article: result.article };
  }

  return { status: "error", error: result.error };
}

interface GetContentOptions {
  /** Whether to show the article image at the top (default: true) */
  showArticleImage?: boolean;
}

/**
 * Get content from a specific tab by ID, or active tab if no ID provided.
 * Parses the HTML with Readability and converts to Markdown.
 */
export async function getContentFromTab(
  url: string,
  tabId?: number,
  options?: GetContentOptions,
): Promise<BrowserContentResult> {
  urlLog.log("fetch:extension:start", { url, tabId });

  if (!hasBrowserExtension()) {
    return { success: false, error: "The Raycast browser extension is not available." };
  }

  const startTime = Date.now();
  try {
    urlLog.log("fetch:extension:calling-api", { url, tabId, timestamp: startTime });

    // Transferring a full page can legitimately take longer than a metadata call,
    // so this gets its own budget rather than the short URL-resolution one.
    const html = await withTimeout(
      () => BrowserExtension.getContent({ format: "html", tabId }),
      null,
      TAB_CONTENT_TIMEOUT_MS,
      "getContent",
    );

    const duration = Date.now() - startTime;
    urlLog.log("fetch:extension:api-returned", { url, tabId, durationMs: duration, hasContent: !!html });

    if (!html || html.trim().length === 0) {
      urlLog.error("fetch:extension:error", {
        url,
        errorType: "empty_content",
        statusCode: null,
      });
      return {
        success: false,
        error: "Could not get content from browser. Make sure the page is fully loaded.",
      };
    }

    urlLog.log("fetch:extension:success", {
      url,
      status: 200,
      contentLength: html.length,
    });

    // Parse with Readability
    const parseResult = parseArticle(html, url);
    if (!parseResult.success) {
      urlLog.error("fetch:extension:error", {
        url,
        errorType: "parse_failed",
        statusCode: null,
      });
      return { success: false, error: parseResult.error.message };
    }

    // Convert to Markdown
    const formatted = formatArticle(parseResult.article.title, parseResult.article.content, {
      image: options?.showArticleImage !== false ? parseResult.article.image : null,
    });

    return {
      success: true,
      article: {
        bodyMarkdown: formatted.markdown,
        title: parseResult.article.title,
        byline: parseResult.article.byline,
        siteName: parseResult.article.siteName,
        url,
        source: tabId !== undefined ? "browser extension (tab)" : "browser extension",
        textContent: parseResult.article.textContent,
      },
    };
  } catch (err) {
    urlLog.error("fetch:extension:error", {
      url,
      errorType: "exception",
      error: String(err),
      statusCode: null,
    });
    return {
      success: false,
      error: "Failed to get content from browser. Make sure the Raycast browser extension is installed.",
    };
  }
}

/**
 * Try to get content from the browser if the URL is already open in a tab.
 * This is the automatic fallback for 403/blocked pages.
 *
 * Returns tab info on failure so the UI can offer to activate the tab.
 */
export async function tryGetContentFromOpenTab(url: string): Promise<TabContentResult> {
  const tab = await findTabByUrl(url);

  if (!tab) {
    urlLog.log("fetch:extension:skip", { url, reason: "tab_not_found" });
    return { status: "tab_not_found" };
  }

  urlLog.log("fetch:extension:found-tab", {
    url,
    tabId: tab.id,
    tabTitle: tab.title,
    isActive: tab.active,
  });

  // getContentFromTab bounds its own wait, which covers the inactive-tab hang this
  // used to race against — with a 5000ms timeout that could never beat the host's own.
  const result = await getContentFromTab(url, tab.id);

  if (result.success) {
    return { status: "success", article: result.article };
  }

  return { status: "fetch_failed", error: result.error, tab };
}

/**
 * Get content from the currently active browser tab.
 * Used when user manually triggers fetch after opening a blocked page.
 */
export async function getContentFromActiveTab(url: string): Promise<BrowserContentResult> {
  return getContentFromTab(url);
}

/**
 * Get the URL of the currently active browser tab.
 * Returns null if extension is not available or no active tab.
 */
export async function getActiveTabUrl(): Promise<{ url: string; tabId: number } | null> {
  const tabs = await getBrowserTabs();
  const activeTab = tabs.find((tab) => tab.active);

  if (activeTab?.url) {
    return { url: activeTab.url, tabId: activeTab.id };
  }

  return null;
}
