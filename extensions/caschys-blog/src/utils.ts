import * as https from "node:https";
import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { parseStringPromise } from "xml2js";

export interface Article {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  creator?: string;
  categories?: string[];
  content?: string;
  guid?: string;
}

interface CachedData {
  articles: Article[];
  timestamp: number;
}

interface FeedOptions {
  maxPosts: number;
  postsPerPage: number;
  query?: string;
}

const FEED_URL = "https://www.stadt-bremerhaven.de/feed/";
const CACHE_KEY = "cached_articles_v2";
const LEGACY_CACHE_KEY = "cached_articles";
const CACHE_EXPIRATION = 10 * 60 * 1000;
const FEED_HOSTS = new Set(["stadt-bremerhaven.de", "www.stadt-bremerhaven.de"]);
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

const HTML_ENTITIES: Record<string, string> = {
  hellip: "…",
  laquo: "«",
  ldquo: "“",
  lsquo: "‘",
  mdash: "—",
  ndash: "–",
  nbsp: " ",
  raquo: "»",
  rdquo: "”",
  rsquo: "’",
};

function decodeCodePoint(value: string, radix: number): string {
  const codePoint = Number.parseInt(value, radix);
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "�";
}

export function formatDate(dateString: string): string {
  const timestamp = safeParseDate(dateString);
  if (timestamp === 0) return "Unknown date";

  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function decodeHtmlEntities(value: string): string {
  let text = value;
  for (let pass = 0; pass < 2; pass++) {
    const decoded = text
      .replace(/&amp;/gi, "&")
      .replace(/&#(\d+);/g, (_match, codePoint: string) => decodeCodePoint(codePoint, 10))
      .replace(/&#x([\da-f]+);/gi, (_match, codePoint: string) => decodeCodePoint(codePoint, 16))
      .replace(/&(hellip|laquo|ldquo|lsquo|mdash|ndash|nbsp|raquo|rdquo|rsquo);/gi, (_match, entity: string) => {
        return HTML_ENTITIES[entity.toLowerCase()] ?? _match;
      })
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
    if (decoded === text) break;
    text = decoded;
  }

  return text;
}

export function htmlToPlainText(value: string): string {
  const text = value.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ");

  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

export function htmlToMarkdown(value: string): string {
  const text = value
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<\/div\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li\s*>/gi, "")
    .replace(/<h[1-6][^>]*>/gi, "\n\n## ")
    .replace(/<\/h[1-6]\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ");

  return decodeHtmlEntities(text)
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncateText(text: string, maxLength: number): string {
  const plainText = htmlToPlainText(text);
  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function safeParseDate(dateString: string): number {
  const timestamp = Date.parse(dateString);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function fetchData(urlOrParams: string, redirectCount = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = urlOrParams.startsWith("http") ? urlOrParams : `${FEED_URL}?${urlOrParams}`;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      reject(new Error("Invalid feed URL"));
      return;
    }

    if (parsedUrl.protocol !== "https:") {
      reject(new Error("The feed URL must use HTTPS"));
      return;
    }
    if (!FEED_HOSTS.has(parsedUrl.hostname)) {
      reject(new Error("The feed redirected to an unexpected host"));
      return;
    }

    const request = https.get(
      parsedUrl,
      {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
          "User-Agent": "Raycast-CaschysBlog-Extension/2.0",
        },
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(statusCode) && response.headers.location) {
          response.resume();
          if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error("The feed redirected too many times"));
            return;
          }
          let redirectUrl: string;
          try {
            redirectUrl = new URL(response.headers.location, parsedUrl).toString();
          } catch {
            reject(new Error("The feed returned an invalid redirect URL"));
            return;
          }
          void fetchData(redirectUrl, redirectCount + 1).then(resolve, reject);
          return;
        }

        if (statusCode !== 200) {
          response.resume();
          reject(new Error(`Feed request failed with HTTP ${statusCode}`));
          return;
        }

        response.setEncoding("utf8");
        let data = "";
        let receivedBytes = 0;

        response.on("data", (chunk: string) => {
          receivedBytes += Buffer.byteLength(chunk);
          if (receivedBytes > MAX_RESPONSE_BYTES) {
            request.destroy(new Error("Feed response exceeds 5 MB"));
            return;
          }
          data += chunk;
        });
        response.on("end", () => resolve(data));
      },
    );

    request.on("error", reject);
    request.setTimeout(15_000, () => request.destroy(new Error("Feed request timed out after 15 seconds")));
  });
}

export async function parseRssFeed(xmlData: string): Promise<Article[]> {
  const result = await parseStringPromise(xmlData, {
    explicitArray: false,
    mergeAttrs: true,
  });

  const rawItems = result?.rss?.channel?.item;
  if (!rawItems) {
    if (result?.rss?.channel) return [];
    throw new Error("The response is not a valid RSS feed");
  }

  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  return items.map((item: Record<string, unknown>) => {
    const guid = item.guid;
    return {
      title: String(item.title || "Untitled article"),
      link: String(item.link || ""),
      pubDate: String(item.pubDate || ""),
      description: String(item.description || ""),
      creator: String(item["dc:creator"] || ""),
      categories: Array.isArray(item.category)
        ? item.category.map(String)
        : item.category
          ? [String(item.category)]
          : [],
      content: String(item["content:encoded"] || item.description || ""),
      guid:
        guid && typeof guid === "object" && "_" in guid
          ? String((guid as Record<string, unknown>)._)
          : String(guid || ""),
    };
  });
}

function clampPreference(value: unknown, fallback: number, maximum: number): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function articleKey(article: Article): string {
  return article.guid || article.link || `${article.title}:${article.pubDate}`;
}

async function fetchArticlePage(page: number, postsPerPage: number, query?: string): Promise<Article[]> {
  const params = new URLSearchParams({
    feed: "rss2",
    posts_per_page: String(postsPerPage),
    paged: String(page),
  });
  if (query) params.set("s", query);

  return parseRssFeed(await fetchData(params.toString()));
}

async function fetchFeedArticles({ maxPosts, postsPerPage, query }: FeedOptions): Promise<Article[]> {
  const articles: Article[] = [];
  const seen = new Set<string>();

  // Each useful page adds at least one unique article, so maxPosts is also a safe request bound.
  for (let page = 1; page <= maxPosts && articles.length < maxPosts; page++) {
    const pageArticles = await fetchArticlePage(page, postsPerPage, query);
    if (pageArticles.length === 0) break;

    const previousCount = articles.length;
    for (const article of pageArticles) {
      const key = articleKey(article);
      if (!seen.has(key)) {
        seen.add(key);
        articles.push(article);
      }
      if (articles.length === maxPosts) break;
    }

    if (articles.length === previousCount) break;
  }

  return articles;
}

function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== "object") return false;
  const article = value as Partial<Article>;
  return (
    typeof article.title === "string" &&
    typeof article.link === "string" &&
    typeof article.pubDate === "string" &&
    typeof article.description === "string" &&
    (article.creator === undefined || typeof article.creator === "string") &&
    (article.content === undefined || typeof article.content === "string") &&
    (article.guid === undefined || typeof article.guid === "string") &&
    (article.categories === undefined ||
      (Array.isArray(article.categories) && article.categories.every((category) => typeof category === "string")))
  );
}

function parseCachedData(cached: string | undefined): CachedData | undefined {
  if (!cached) return undefined;

  try {
    const parsed = JSON.parse(cached) as Partial<CachedData>;
    if (
      !Array.isArray(parsed.articles) ||
      !parsed.articles.every(isArticle) ||
      typeof parsed.timestamp !== "number" ||
      !Number.isFinite(parsed.timestamp)
    ) {
      return undefined;
    }
    return { articles: parsed.articles, timestamp: parsed.timestamp };
  } catch {
    return undefined;
  }
}

async function readCache(): Promise<CachedData | undefined> {
  const current = parseCachedData(await LocalStorage.getItem<string>(CACHE_KEY));
  if (current) return current;

  const legacy = parseCachedData(await LocalStorage.getItem<string>(LEGACY_CACHE_KEY));
  if (!legacy) return undefined;

  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(legacy));
  await LocalStorage.removeItem(LEGACY_CACHE_KEY);
  return legacy;
}

export async function fetchArticles(forceRefresh = false): Promise<Article[]> {
  const preferences = getPreferenceValues<Preferences>();
  const postsPerPage = clampPreference(preferences.postsPerPage, 30, 50);
  const maxPosts = clampPreference(preferences.maxPosts, 90, 200);
  const cached = await readCache();

  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_EXPIRATION) {
    return cached.articles;
  }

  try {
    const articles = await fetchFeedArticles({ maxPosts, postsPerPage });
    if (articles.length === 0) throw new Error("The feed returned no articles");

    await LocalStorage.setItem(CACHE_KEY, JSON.stringify({ articles, timestamp: Date.now() } satisfies CachedData));
    return articles;
  } catch (error) {
    if (cached) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not refresh articles",
        message: "Showing the last cached result",
      });
      return cached.articles;
    }
    throw error;
  }
}

export async function searchArticleFeed(query: string, limit = 20): Promise<Article[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error("Enter a search term");

  return fetchFeedArticles({
    maxPosts: clampPreference(limit, 20, 100),
    postsPerPage: 20,
    query: normalizedQuery,
  });
}
