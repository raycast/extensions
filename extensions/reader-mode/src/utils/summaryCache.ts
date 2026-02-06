import { LocalStorage } from "@raycast/api";
import { SummaryStyle, SupportedLanguage } from "../types/summary";
import { aiLog } from "./logger";

/**
 * Cached summary entry
 */
interface CachedSummary {
  summary: string;
  style: SummaryStyle;
  timestamp: number;
}

/**
 * Cache key prefix for summaries
 */
const CACHE_PREFIX = "summary:";

/**
 * Cache key prefix for rewritten titles
 */
const TITLE_CACHE_PREFIX = "title:";

/**
 * Key for tracking the last summary style used per URL
 */
const LAST_STYLE_PREFIX = "lastStyle:";

/**
 * Generate a simple hash for a URL to use as cache key
 */
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Build cache key for a URL + style + language combination
 * Language is always included in the key to support per-language caching
 */
function buildCacheKey(url: string, style: SummaryStyle, language: SupportedLanguage): string {
  return `${CACHE_PREFIX}${hashUrl(url)}:${style}:${language}`;
}

/**
 * Build key for tracking last used style
 */
function buildLastStyleKey(url: string): string {
  return `${LAST_STYLE_PREFIX}${hashUrl(url)}`;
}

/**
 * Get cached summary for a URL + style + language combination
 */
export async function getCachedSummary(
  url: string,
  style: SummaryStyle,
  language: SupportedLanguage,
): Promise<string | undefined> {
  const key = buildCacheKey(url, style, language);
  try {
    const cached = await LocalStorage.getItem<string>(key);
    if (cached) {
      const entry: CachedSummary = JSON.parse(cached);
      aiLog.log("cache:hit", { url, style, age: Date.now() - entry.timestamp });
      return entry.summary;
    }
    aiLog.log("cache:miss", { url, style });
    return undefined;
  } catch (error) {
    aiLog.error("cache:error", { url, style, error: String(error) });
    return undefined;
  }
}

/**
 * Store summary in cache
 */
export async function setCachedSummary(
  url: string,
  style: SummaryStyle,
  summary: string,
  language: SupportedLanguage,
): Promise<void> {
  const key = buildCacheKey(url, style, language);
  const lastStyleKey = buildLastStyleKey(url);

  const entry: CachedSummary = {
    summary,
    style,
    timestamp: Date.now(),
  };

  try {
    await LocalStorage.setItem(key, JSON.stringify(entry));
    await LocalStorage.setItem(lastStyleKey, style);
    aiLog.log("cache:set", { url, style, summaryLength: summary.length });
  } catch (error) {
    aiLog.error("cache:setError", { url, style, error: String(error) });
  }
}

/**
 * Get the last summary style used for a URL
 */
export async function getLastSummaryStyle(url: string): Promise<SummaryStyle | undefined> {
  const key = buildLastStyleKey(url);
  try {
    const style = await LocalStorage.getItem<SummaryStyle>(key);
    return style;
  } catch {
    return undefined;
  }
}

/**
 * Get all cached summaries for a URL (all styles)
 */
export async function getAllCachedSummaries(
  url: string,
  language: SupportedLanguage,
): Promise<Map<SummaryStyle, string>> {
  const styles: SummaryStyle[] = [
    "overview",
    "comprehensive",
    "opposite-sides",
    "five-ws",
    "eli5",
    "entities",
    "at-a-glance",
  ];

  const results = new Map<SummaryStyle, string>();

  for (const style of styles) {
    const summary = await getCachedSummary(url, style, language);
    if (summary) {
      results.set(style, summary);
    }
  }

  return results;
}

/**
 * Build cache key for rewritten title
 */
function buildTitleCacheKey(url: string): string {
  return `${TITLE_CACHE_PREFIX}${hashUrl(url)}`;
}

/**
 * Get cached rewritten title for a URL
 */
export async function getCachedTitle(url: string): Promise<string | undefined> {
  const key = buildTitleCacheKey(url);
  try {
    const cached = await LocalStorage.getItem<string>(key);
    if (cached) {
      aiLog.log("titleCache:hit", { url });
      return cached;
    }
    aiLog.log("titleCache:miss", { url });
    return undefined;
  } catch (error) {
    aiLog.error("titleCache:error", { url, error: String(error) });
    return undefined;
  }
}

/**
 * Store rewritten title in cache
 */
export async function setCachedTitle(url: string, title: string): Promise<void> {
  const key = buildTitleCacheKey(url);
  try {
    await LocalStorage.setItem(key, title);
    aiLog.log("titleCache:set", { url, titleLength: title.length });
  } catch (error) {
    aiLog.error("titleCache:setError", { url, error: String(error) });
  }
}
