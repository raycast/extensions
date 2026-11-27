import { APPLE_EPOCH_OFFSET_SECONDS, SEARCH_ENGINES, SearchEngineId } from "./constants";
import { BrowserSettingsSnapshot } from "./types";

/**
 * Convert a Search Browser timestamp (Apple CFAbsoluteTime seconds since 2001-01-01)
 * or Unix timestamp into a JS Date.
 */
export function parseSearchTimestamp(value: unknown): Date {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return new Date(0);
  }
  // Unix timestamps in seconds after 2020 are > 1_577_836_800; Apple CFAbsoluteTime values are < 1_500_000_000 for decades.
  // Millisecond timestamps are > 1_000_000_000_000.
  if (value > 1_000_000_000_000) {
    return new Date(value);
  }
  if (value > 1_400_000_000) {
    return new Date(value * 1000);
  }
  return new Date((value + APPLE_EPOCH_OFFSET_SECONDS) * 1000);
}

/**
 * Extract a clean display hostname from a URL.
 */
export function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "") || url;
  } catch {
    return url;
  }
}

/**
 * Determine whether user input looks like a URL or domain rather than a search query.
 */
export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }
  if (/^(https?|file|mailto):\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return true;
  }
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(trimmed)) {
    return true;
  }
  // Domain with a valid-looking TLD (at least 2 letters) and optional port/path
  return (
    /^[a-z0-9-]+(\.[a-z0-9-]+)+(\.[a-z]{2,}|:\d+)(\/.*)?$/i.test(trimmed) ||
    /^[a-z0-9-]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed)
  );
}

/**
 * Resolve a search engine ID & template from extension preferences + Search Browser's own settings.
 */
export function resolveSearchEngine(
  preferredEngine: SearchEngineId | undefined,
  browserSettings?: BrowserSettingsSnapshot | null
): { name: string; urlTemplate: string } {
  const pref = preferredEngine ?? "browser";
  if (pref !== "browser" && pref in SEARCH_ENGINES) {
    return SEARCH_ENGINES[pref];
  }

  // Respect Search Browser's own configured engine when available
  const browserEngine = browserSettings?.engine?.toLowerCase().trim();
  if (browserEngine === "custom" && browserSettings?.customSearchUrl) {
    const template = browserSettings.customSearchUrl.includes("%s")
      ? browserSettings.customSearchUrl
      : `${browserSettings.customSearchUrl}%s`;
    return { name: "Custom Search", urlTemplate: template };
  }
  if (browserEngine && browserEngine in SEARCH_ENGINES) {
    return SEARCH_ENGINES[browserEngine as Exclude<SearchEngineId, "browser">];
  }

  return SEARCH_ENGINES.google;
}

/**
 * Turn an input string (either a URL or search terms) into a navigable URL.
 */
export function buildNavigableUrl(
  input: string,
  preferredEngine?: SearchEngineId,
  browserSettings?: BrowserSettingsSnapshot | null
): { url: string; isSearch: boolean; engineName: string } {
  const trimmed = input.trim();
  const engine = resolveSearchEngine(preferredEngine, browserSettings);

  if (looksLikeUrl(trimmed)) {
    if (/^(https?|file):\/\/|^mailto:/i.test(trimmed)) {
      return { url: trimmed, isSearch: false, engineName: engine.name };
    }
    const protocol = /^localhost\b|^\d{1,3}(\.\d{1,3}){3}\b/i.test(trimmed) ? "http://" : "https://";
    return { url: `${protocol}${trimmed}`, isSearch: false, engineName: engine.name };
  }

  const encoded = encodeURIComponent(trimmed);
  const url = engine.urlTemplate.includes("%s")
    ? engine.urlTemplate.replace("%s", encoded)
    : `${engine.urlTemplate}${encoded}`;
  return { url, isSearch: true, engineName: engine.name };
}

/**
 * Format a title + URL as a clean Markdown link.
 */
export function formatMarkdownLink(title: string, url: string): string {
  const safeTitle = (title.trim() || getDomain(url)).replace(/[[\]]/g, "\\$&");
  return `[${safeTitle}](${url})`;
}

/**
 * Group a Date into a human-friendly section label (Today, Yesterday, This Week, This Month, Older).
 */
export function getDateSectionLabel(date: Date, now: Date = new Date()): string {
  if (!date || Number.isNaN(date.getTime()) || date.getTime() <= 0) {
    return "Older";
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfWeek = startOfToday - 7 * 86_400_000;
  const startOfMonth = startOfToday - 30 * 86_400_000;
  const ts = date.getTime();

  if (ts >= startOfToday) return "Today";
  if (ts >= startOfYesterday) return "Yesterday";
  if (ts >= startOfWeek) return "This Week";
  if (ts >= startOfMonth) return "This Month";
  return "Older";
}

/**
 * Format a compact relative/local timestamp for history rows.
 */
export function formatVisitTime(date: Date, now: Date = new Date()): string {
  if (!date || Number.isNaN(date.getTime()) || date.getTime() <= 0) {
    return "";
  }
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Simple multi-token case-insensitive matching for fast filtering.
 */
export function matchesQuery(query: string, ...fields: Array<string | undefined>): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Safely decode a base64-encoded JSON string (used inside Search's icloud.json `values`).
 */
export function decodeBase64Json<T>(encoded: unknown): T | null {
  if (typeof encoded !== "string" || !encoded.trim()) return null;
  try {
    const raw = Buffer.from(encoded, "base64").toString("utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Normalize a URL for deduplication (strip trailing slash differences on root).
 */
export function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    const normalizedPath = u.pathname === "/" ? "" : u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.host.toLowerCase()}${normalizedPath}${u.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}
