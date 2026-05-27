import { getPreferenceValues } from "@raycast/api";
import { Cache } from "@raycast/api";
import type {
  FreshRSSPreferences,
  Feed,
  Article,
  ArticleFetchResult,
  Category,
  FreshRSSSubscriptionListResponse,
  FreshRSSSubscription,
  FreshRSSQuickAddResponse,
  FreshRSSStreamContentsResponse,
  FreshRSSStreamItem,
  FreshRSSTagListResponse,
  FreshRSSUnreadCountResponse,
} from "./types";

let cachedAuthToken: string | null = null;
let cachedWriteToken: string | null = null;

const cache = new Cache();

const CACHE_KEYS = {
  feeds: "freshrss_feeds",
  feedsTTL: "freshrss_feeds_ttl",
  categories: "freshrss_categories",
  categoriesTTL: "freshrss_categories_ttl",
} as const;

const CACHE_TTL_MS = 5 * 60 * 1000;

function getPreferences(): FreshRSSPreferences {
  return getPreferenceValues<FreshRSSPreferences>();
}

function normalizeBaseUrl(url: string): string {
  let normalized = url.trim();
  while (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

function getApiBaseUrl(): string {
  const prefs = getPreferences();
  return `${normalizeBaseUrl(prefs.baseUrl)}/api/greader.php`;
}

class FreshRSSAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreshRSSAuthError";
  }
}

class FreshRSSApiError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "FreshRSSApiError";
    this.statusCode = statusCode;
  }
}

async function request(
  path: string,
  options: {
    method?: string;
    params?: Record<string, string>;
    body?: string;
    requireAuth?: boolean;
    requireWriteToken?: boolean;
  } = {}
): Promise<string> {
  const {
    method = "GET",
    params = {},
    body,
    requireAuth = true,
    requireWriteToken = false,
  } = options;

  const prefs = getPreferences();

  if (!prefs.baseUrl?.trim()) {
    throw new FreshRSSAuthError("Base URL is not configured. Set it in Raycast preferences.");
  }
  if (!prefs.username?.trim()) {
    throw new FreshRSSAuthError("Username is not configured. Set it in Raycast preferences.");
  }
  if (!prefs.apiPassword?.trim()) {
    throw new FreshRSSAuthError("API password is not configured. Set it in Raycast preferences.");
  }

  let authToken = "";
  if (requireAuth) {
    authToken = await login();
  }

  let writeToken = "";
  if (requireWriteToken) {
    writeToken = await getToken();
  }

  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}${path}`);

  if (method === "GET") {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {};
  if (authToken) {
    headers["Authorization"] = `GoogleLogin auth=${authToken}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (method === "POST") {
    if (body) {
      fetchOptions.body = body;
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (requireWriteToken) {
      const formBodyParts: string[] = [];
      if (writeToken) {
        formBodyParts.push(`T=${encodeURIComponent(writeToken)}`);
      }
      for (const [key, value] of Object.entries(params)) {
        formBodyParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
      fetchOptions.body = formBodyParts.join("&");
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), fetchOptions);
  } catch {
    throw new FreshRSSApiError(
      `Network error: Unable to connect to FreshRSS at ${normalizeBaseUrl(prefs.baseUrl)}. ` +
        `Check that the server is running and the base URL is correct.`,
      0
    );
  }

  if (response.status === 401 || response.status === 403) {
    cachedAuthToken = null;
    cachedWriteToken = null;
    if (response.status === 401) {
      throw new FreshRSSAuthError(
        "Authentication failed. Check your username and API password in Raycast preferences. " +
          "The API password is not the same as your FreshRSS login password."
      );
    }
    throw new FreshRSSAuthError(
      "Access forbidden. The FreshRSS API may be disabled. " +
        "Enable 'Allow API access' in FreshRSS settings under Authentication."
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new FreshRSSApiError(
      `FreshRSS API error (${response.status}): ${text || response.statusText}`,
      response.status
    );
  }

  const responseText = await response.text();

  return responseText;
}

async function login(): Promise<string> {
  if (cachedAuthToken) {
    return cachedAuthToken;
  }

  const prefs = getPreferences();
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/accounts/ClientLogin`;

  const bodyParams = new URLSearchParams();
  bodyParams.set("Email", prefs.username);
  bodyParams.set("Passwd", prefs.apiPassword);
  bodyParams.set("service", "reader");
  bodyParams.set("client", "raycast-freshrss");
  const bodyStr = bodyParams.toString();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyStr,
    });
  } catch {
    throw new FreshRSSAuthError(
      `Network error: Unable to connect to FreshRSS at ${normalizeBaseUrl(prefs.baseUrl)}. ` +
        `Check that the server is running and the base URL is correct.`
    );
  }

  if (!response.ok) {
    cachedAuthToken = null;
    cachedWriteToken = null;
    if (response.status === 401 || response.status === 403) {
      throw new FreshRSSAuthError(
        "Authentication failed. Check your username and API password in Raycast preferences. " +
          "The API password is not the same as your FreshRSS login password."
      );
    }
    const text = await response.text().catch(() => "");
    if (text.includes("Not Found") || text.includes("PAGE NOT FOUND")) {
      throw new FreshRSSApiError(
        `FreshRSS API not found at ${normalizeBaseUrl(prefs.baseUrl)}. ` +
          `Make sure the base URL is correct and API access is enabled in FreshRSS settings.`,
        404
      );
    }
    throw new FreshRSSAuthError(
      `Authentication failed (${response.status}): ${text || response.statusText}`
    );
  }

  const text = await response.text();
  const authLine = text.split("\n").find((line: string) => line.startsWith("Auth="));
  if (!authLine) {
    throw new FreshRSSAuthError(
      "Unexpected authentication response from FreshRSS. The server may be misconfigured."
    );
  }

  cachedAuthToken = authLine.substring("Auth=".length).trim();
  return cachedAuthToken;
}

async function getToken(): Promise<string> {
  if (cachedWriteToken) {
    return cachedWriteToken;
  }

  const text = await request("/reader/api/0/token", {
    method: "GET",
    requireAuth: true,
    requireWriteToken: false,
  });

  cachedWriteToken = text.trim();
  return cachedWriteToken;
}

function isCacheValid(ttlKey: string): boolean {
  const timestamp = cache.get(ttlKey);
  if (!timestamp) return false;
  return Date.now() < parseInt(timestamp, 10);
}

function setCacheWithTTL(key: string, ttlKey: string, value: string): void {
  cache.set(key, value);
  cache.set(ttlKey, String(Date.now() + CACHE_TTL_MS));
}

function buildFeedIconMap(feeds: Feed[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const feed of feeds) {
    if (feed.iconUrl && feed.id) {
      const numericId = feed.id.replace("feed/", "");
      map.set(numericId, feed.iconUrl);
      map.set(feed.id, feed.iconUrl);
    }
  }
  return map;
}

function parseStreamItem(item: FreshRSSStreamItem, iconMap?: Map<string, string>): Article {
  const articleUrl =
    item.alternate?.find((a: { href: string; type: string }) => a.type === "text/html")?.href ||
    item.alternate?.[0]?.href ||
    "";

  const categories = item.categories || [];
  const isRead = categories.includes("user/-/state/com.google/read");
  const isStarred = categories.includes("user/-/state/com.google/starred");

  const publishedAt = item.published ? new Date(item.published * 1000).toISOString() : undefined;
  const updatedAt = item.updated ? new Date(item.updated * 1000).toISOString() : undefined;

  const rawSummary = item.summary?.content || item.content?.content || undefined;
  const summary = rawSummary ? rawSummary.replace(/<[^>]*>/g, "").trim().slice(0, 300) : undefined;

  let feedIconUrl: string | undefined;
  if (iconMap && item.origin?.streamId) {
    feedIconUrl = iconMap.get(item.origin.streamId);
  }

  return {
    id: item.id,
    title: item.title || "Untitled",
    url: articleUrl,
    feedId: item.origin?.streamId,
    feedTitle: item.origin?.title,
    feedIconUrl,
    author: item.author,
    publishedAt,
    updatedAt,
    summary,
    content: item.content?.content || item.summary?.content,
    isRead,
    isStarred,
  };
}

export async function getFeeds(forceRefresh?: boolean): Promise<Feed[]> {
  if (!forceRefresh && isCacheValid(CACHE_KEYS.feedsTTL)) {
    const cached = cache.get(CACHE_KEYS.feeds);
    if (cached) {
      try {
        return JSON.parse(cached) as Feed[];
      } catch {
        // cache corrupted, proceed to fetch
      }
    }
  }

  const text = await request("/reader/api/0/subscription/list", {
    params: { output: "json" },
  });

  const data: FreshRSSSubscriptionListResponse = JSON.parse(text);

  const feeds = (data.subscriptions || []).map((sub: FreshRSSSubscription) => ({
    id: sub.id,
    title: sub.title || "Untitled Feed",
    url: sub.url,
    htmlUrl: sub.htmlUrl,
    iconUrl: sub.iconUrl,
    categories: sub.categories?.map((cat: { id: string; label: string }) => ({ id: cat.id, label: cat.label })),
  }));

  setCacheWithTTL(CACHE_KEYS.feeds, CACHE_KEYS.feedsTTL, JSON.stringify(feeds));

  return feeds;
}

export async function getCategories(): Promise<Category[]> {
  if (isCacheValid(CACHE_KEYS.categoriesTTL)) {
    const cached = cache.get(CACHE_KEYS.categories);
    if (cached) {
      try {
        return JSON.parse(cached) as Category[];
      } catch {
        // cache corrupted, proceed to fetch
      }
    }
  }

  const text = await request("/reader/api/0/tag/list", {
    params: { output: "json" },
  });

  const data: FreshRSSTagListResponse = JSON.parse(text);

  const categories: Category[] = (data.tags || [])
    .filter((tag: { id: string; type?: string; label?: string; unread_count?: number }) => {
      const id = tag.id || "";
      return id.startsWith("user/-/label/");
    })
    .map((tag: { id: string; type?: string; label?: string; unread_count?: number }) => ({
      id: tag.id,
      label: tag.label || tag.id.replace("user/-/label/", ""),
      type: tag.type,
      unreadCount: tag.unread_count,
    }));

  setCacheWithTTL(CACHE_KEYS.categories, CACHE_KEYS.categoriesTTL, JSON.stringify(categories));

  return categories;
}

export async function getUnreadCounts(): Promise<Map<string, number>> {
  const text = await request("/reader/api/0/unread-count", {
    params: { output: "json" },
  });

  const data: FreshRSSUnreadCountResponse = JSON.parse(text);
  const counts = new Map<string, number>();
  for (const entry of data.unreadcounts || []) {
    if (entry.id.startsWith("feed/")) {
      counts.set(entry.id, entry.count);
    }
  }
  return counts;
}

export async function getArticlesByCategory(categoryId: string, continuation?: string): Promise<ArticleFetchResult> {
  const feeds = await getFeeds();
  const iconMap = buildFeedIconMap(feeds);

  const params: Record<string, string> = {
    output: "json",
    n: "50",
  };

  if (continuation) {
    params["c"] = continuation;
  }

  const text = await request(`/reader/api/0/stream/contents/${categoryId}`, { params });

  const data: FreshRSSStreamContentsResponse = JSON.parse(text);
  const articles = (data.items || []).map((item: FreshRSSStreamItem) => parseStreamItem(item, iconMap));

  return {
    articles,
    continuation: data.continuation,
  };
}

export async function getArticlesByFeed(feedId: string, continuation?: string): Promise<ArticleFetchResult> {
  const feeds = await getFeeds();
  const iconMap = buildFeedIconMap(feeds);

  const params: Record<string, string> = {
    output: "json",
    n: "50",
  };

  if (continuation) {
    params["c"] = continuation;
  }

  const text = await request(`/reader/api/0/stream/contents/${feedId}`, { params });

  const data: FreshRSSStreamContentsResponse = JSON.parse(text);
  const articles = (data.items || []).map((item: FreshRSSStreamItem) => parseStreamItem(item, iconMap));

  return {
    articles,
    continuation: data.continuation,
  };
}

export async function addFeed(feedUrl: string, category?: string): Promise<void> {
  cache.set(CACHE_KEYS.feeds, "");
  cache.set(CACHE_KEYS.feedsTTL, "0");

  if (category) {
    await request("/reader/api/0/subscription/edit", {
      method: "POST",
      requireAuth: true,
      requireWriteToken: true,
      params: {
        ac: "subscribe",
        s: `feed/${feedUrl}`,
        a: category,
      },
    });
  } else {
    const text = await request("/reader/api/0/subscription/quickadd", {
      method: "POST",
      requireAuth: true,
      requireWriteToken: false,
      body: new URLSearchParams({ quickadd: feedUrl }).toString(),
    });

    let result: FreshRSSQuickAddResponse;
    try {
      result = JSON.parse(text);
    } catch {
      throw new FreshRSSApiError("Unexpected response when adding feed. The feed URL may be invalid.", 0);
    }

    if (result.numResults === 0) {
      throw new FreshRSSApiError(
        result.error || "Failed to add feed. The URL may not be a valid RSS/Atom feed, or it may already be subscribed.",
        0
      );
    }
  }
}

export async function removeFeed(feedId: string): Promise<void> {
  cache.set(CACHE_KEYS.feeds, "");
  cache.set(CACHE_KEYS.feedsTTL, "0");

  await request("/reader/api/0/subscription/edit", {
    method: "POST",
    requireAuth: true,
    requireWriteToken: true,
    params: {
      ac: "unsubscribe",
      s: feedId,
    },
  });
}

export async function editFeed(feedId: string, options: { title?: string; category?: string }): Promise<void> {
  cache.set(CACHE_KEYS.feeds, "");
  cache.set(CACHE_KEYS.feedsTTL, "0");

  const params: Record<string, string> = {
    ac: "edit",
    s: feedId,
  };

  if (options.title) {
    params["t"] = options.title;
  }

  if (options.category) {
    params["a"] = options.category;
  }

  await request("/reader/api/0/subscription/edit", {
    method: "POST",
    requireAuth: true,
    requireWriteToken: true,
    params,
  });
}

export async function refreshFeeds(): Promise<void> {
  cache.set(CACHE_KEYS.feeds, "");
  cache.set(CACHE_KEYS.feedsTTL, "0");
  cache.set(CACHE_KEYS.categories, "");
  cache.set(CACHE_KEYS.categoriesTTL, "0");

  await getFeeds(true);
}

async function fetchArticleStream(
  streamPath: string,
  extraParams: Record<string, string>,
  continuation?: string
): Promise<ArticleFetchResult> {
  const feeds = await getFeeds();
  const iconMap = buildFeedIconMap(feeds);

  const params: Record<string, string> = {
    output: "json",
    n: "50",
    ...extraParams,
  };

  if (continuation) {
    params["c"] = continuation;
  }

  const text = await request(`/reader/api/0/stream/contents/${streamPath}`, { params });

  const data: FreshRSSStreamContentsResponse = JSON.parse(text);
  const articles = (data.items || []).map((item: FreshRSSStreamItem) => parseStreamItem(item, iconMap));

  return {
    articles,
    continuation: data.continuation,
  };
}

export async function getUnreadArticles(continuation?: string): Promise<ArticleFetchResult> {
  return fetchArticleStream(
    "reading-list",
    { xt: "user/-/state/com.google/read" },
    continuation
  );
}

export async function getAllArticles(continuation?: string): Promise<ArticleFetchResult> {
  return fetchArticleStream("reading-list", {}, continuation);
}

export async function getReadArticles(continuation?: string): Promise<ArticleFetchResult> {
  return fetchArticleStream(
    "reading-list",
    { it: "user/-/state/com.google/read" },
    continuation
  );
}

export async function getStarredArticles(continuation?: string): Promise<ArticleFetchResult> {
  return fetchArticleStream(
    "reading-list",
    { it: "user/-/state/com.google/starred" },
    continuation
  );
}

export async function searchArticles(query: string, continuation?: string): Promise<ArticleFetchResult> {
  const result = await fetchArticleStream("reading-list", {}, continuation);

  const lowerQuery = query.toLowerCase();
  const filtered = result.articles.filter((article) => {
    const title = (article.title || "").toLowerCase();
    const summary = (article.summary || "").toLowerCase();
    const author = (article.author || "").toLowerCase();
    const url = (article.url || "").toLowerCase();
    const feedTitle = (article.feedTitle || "").toLowerCase();

    return (
      title.includes(lowerQuery) ||
      summary.includes(lowerQuery) ||
      author.includes(lowerQuery) ||
      url.includes(lowerQuery) ||
      feedTitle.includes(lowerQuery)
    );
  });

  return {
    articles: filtered,
    continuation: result.continuation,
  };
}

export async function markArticleRead(articleId: string): Promise<void> {
  await request("/reader/api/0/edit-tag", {
    method: "POST",
    requireAuth: true,
    requireWriteToken: true,
    params: {
      i: articleId,
      a: "user/-/state/com.google/read",
    },
  });
}

export async function markArticleUnread(articleId: string): Promise<void> {
  await request("/reader/api/0/edit-tag", {
    method: "POST",
    requireAuth: true,
    requireWriteToken: true,
    params: {
      i: articleId,
      r: "user/-/state/com.google/read",
    },
  });
}

export async function starArticle(articleId: string): Promise<void> {
  await request("/reader/api/0/edit-tag", {
    method: "POST",
    requireAuth: true,
    requireWriteToken: true,
    params: {
      i: articleId,
      a: "user/-/state/com.google/starred",
    },
  });
}

export async function unstarArticle(articleId: string): Promise<void> {
  await request("/reader/api/0/edit-tag", {
    method: "POST",
    requireAuth: true,
    requireWriteToken: true,
    params: {
      i: articleId,
      r: "user/-/state/com.google/starred",
    },
  });
}

export async function markAllAsRead(articleIds: string[]): Promise<void> {
  if (articleIds.length === 0) return;

  const writeToken = await getToken();

  const bodyParts: string[] = [];
  bodyParts.push(`T=${encodeURIComponent(writeToken)}`);
  bodyParts.push(`a=${encodeURIComponent("user/-/state/com.google/read")}`);
  for (const id of articleIds) {
    bodyParts.push(`i=${encodeURIComponent(id)}`);
  }

  await request("/reader/api/0/edit-tag", {
    method: "POST",
    requireAuth: true,
    requireWriteToken: false,
    body: bodyParts.join("&"),
  });
}

export { FreshRSSAuthError, FreshRSSApiError };
