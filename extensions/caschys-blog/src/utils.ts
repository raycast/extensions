import * as https from "https";
import { parseStringPromise } from "xml2js";
import { showToast, Toast, LocalStorage, getPreferenceValues } from "@raycast/api";

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

// Cache expiration time (24 hours)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

// Format a date string
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Truncate text to a specified length
export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";

  // Remove HTML tags
  const plainText = text.replace(/<[^>]*>/g, "");

  if (plainText.length <= maxLength) return plainText;

  return plainText.substring(0, maxLength) + "...";
}

// Notify about article updates
function notifyArticleUpdates(articles: Article[]) {
  // This function is called when new articles are fetched
  // It could be expanded to show notifications or update UI
  console.log(`Updated articles: ${articles.length}`);
}

// Clear the cache
async function clearCache() {
  await LocalStorage.removeItem("cached_articles");
  console.log("Cache cleared");
}

/**
 * Safely parse a date string and return a timestamp
 * @param dateString The date string to parse
 * @returns The timestamp (milliseconds since epoch) or 0 if parsing fails
 */
export function safeParseDate(dateString: string): number {
  try {
    return new Date(dateString).getTime();
  } catch (error) {
    console.error(`Error parsing date: ${dateString}`, error);
    return 0;
  }
}

/**
 * Performs an HTTP request and returns the response as a string
 */
export function fetchData(urlOrParams: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Determine if we're dealing with a full URL or just params
    const isFullUrl = urlOrParams.startsWith("http");
    const url = isFullUrl ? urlOrParams : `https://www.stadt-bremerhaven.de/feed/?${urlOrParams}`;

    console.log(`Fetching: ${url}`);

    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Raycast-CaschysBlog-Extension/1.0",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      },
      (res) => {
        // Handle redirects manually
        if (res.statusCode === 301 || res.statusCode === 302) {
          if (res.headers.location) {
            const redirectUrl = new URL(res.headers.location, url).toString();
            console.log(`Following redirect to: ${redirectUrl}`);
            // Add redirect count to prevent infinite loops
            const redirectCount = Number(req.getHeader("x-redirect-count") || 0);
            if (redirectCount >= 5) {
              reject(new Error("Too many redirects"));
              return;
            }
            return fetchData(redirectUrl).then(resolve).catch(reject);
          }
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Request failed with status code ${res.statusCode}`));
          return;
        }

        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data);
        });
      },
    );

    req.on("error", (err) => {
      reject(err);
    });

    // Set timeout to 30 seconds
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timeout after 30 seconds"));
    });
  });
}

/**
 * Parses an RSS feed and returns the articles
 */
export async function parseRssFeed(xmlData: string): Promise<Article[]> {
  try {
    const result = await parseStringPromise(xmlData, {
      explicitArray: false,
      mergeAttrs: true,
    });

    if (!result.rss || !result.rss.channel || !result.rss.channel.item) {
      throw new Error("Invalid RSS format");
    }

    const items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];

    return items.map((item: Record<string, unknown>) => ({
      title: (item.title as string) || "No Title",
      link: (item.link as string) || "",
      pubDate: (item.pubDate as string) || "",
      description: (item.description as string) || "",
      creator: (item["dc:creator"] as string) || "",
      categories: Array.isArray(item.category)
        ? (item.category as string[])
        : item.category
          ? [item.category as string]
          : [],
      content: (item["content:encoded"] as string) || (item.description as string) || "",
      guid:
        item.guid && typeof item.guid === "object" && "_" in (item.guid as object)
          ? ((item.guid as Record<string, string>)._ as string)
          : (item.guid as string) || "",
    }));
  } catch (error) {
    console.error("Error parsing RSS feed:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error parsing RSS feed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Fetches a single page of articles
 */
async function fetchArticlePage(
  page: number,
  options: {
    perPage?: number;
  } = {},
): Promise<Article[]> {
  const preferences = getPreferenceValues();
  const defaultPerPage = parseInt(preferences.postsPerPage as string) || 30;
  const { perPage = defaultPerPage } = options;

  console.log(`Fetching page ${page} (per_page: ${perPage})...`);

  const params = new URLSearchParams({
    feed: "rss2", // Ensure we get RSS 2.0 format
    posts_per_page: perPage.toString(),
    paged: page.toString(),
  }).toString();

  const xmlData = await fetchData(params);
  return parseRssFeed(xmlData);
}

/**
 * Loads articles from Caschys Blog with caching and progressive loading
 */
export async function fetchArticles(forceRefresh: boolean = false): Promise<Article[]> {
  const startTime = performance.now();
  const preferences = getPreferenceValues();
  const postsPerPage = parseInt(preferences.postsPerPage as string) || 30;
  const maxPosts = parseInt(preferences.maxPosts as string) || 90;

  try {
    // Clear cache if force refresh is requested
    if (forceRefresh) {
      await clearCache();
    }

    // Try to get cached data
    const cached = await LocalStorage.getItem<string>("cached_articles");
    if (cached) {
      const cachedData: CachedData = JSON.parse(cached);
      const age = Date.now() - cachedData.timestamp;

      // If cache is still fresh, use it
      if (age < CACHE_EXPIRATION) {
        console.log(`Using cached articles (${(age / 1000 / 60).toFixed(1)} minutes old)`);
        return cachedData.articles;
      } else {
        console.log(`Cache expired (${(age / 1000 / 60).toFixed(1)} minutes old)`);
      }
    }

    // Initial fetch of first page
    const firstPageArticles = await fetchArticlePage(1, { perPage: postsPerPage });
    let allArticles = [...firstPageArticles];

    // Notify about initial articles
    notifyArticleUpdates(allArticles);

    // Continue fetching in background if we got a full page and haven't reached max posts
    if (firstPageArticles.length === postsPerPage && allArticles.length < maxPosts) {
      // Show background loading toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Loading more articles...",
        message: "Fetching additional pages in background",
      });

      // Background fetching
      (async () => {
        let page = 2;
        let hasMore = true;
        const maxPages = Math.ceil(maxPosts / postsPerPage);

        while (hasMore && page <= maxPages && allArticles.length < maxPosts) {
          try {
            const articles = await fetchArticlePage(page, { perPage: postsPerPage });

            // If we got less articles than requested or no articles, we've reached the end
            if (articles.length === 0 || articles.length < postsPerPage) {
              hasMore = false;
            }

            allArticles = [...allArticles, ...articles];
            console.log(`Fetched page ${page}: ${articles.length} articles (total: ${allArticles.length})`);

            // Check if we've reached the maximum number of posts
            if (allArticles.length >= maxPosts) {
              console.log(`Reached maximum number of posts (${maxPosts}), stopping fetch`);
              allArticles = allArticles.slice(0, maxPosts);
              hasMore = false;
            }

            // Remove any duplicates
            const uniqueArticles = allArticles.filter(
              (article, index, self) =>
                index === self.findIndex((a) => (a.guid || a.link) === (article.guid || article.link)),
            );

            // Notify about new articles
            notifyArticleUpdates(uniqueArticles);

            // Small delay between requests
            if (hasMore) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }

            page++;
          } catch (error) {
            console.error(`Error fetching page ${page}:`, error);
            hasMore = false;
          }
        }

        const endTime = performance.now();
        console.log(`Fetched ${allArticles.length} articles in ${(endTime - startTime).toFixed(2)}ms`);

        // Final duplicate removal
        const finalArticles = allArticles.filter(
          (article, index, self) =>
            index === self.findIndex((a) => (a.guid || a.link) === (article.guid || article.link)),
        );

        if (finalArticles.length < allArticles.length) {
          console.log(`Removed ${allArticles.length - finalArticles.length} duplicate articles`);
        }

        // Cache the complete set
        const cacheData: CachedData = {
          articles: finalArticles,
          timestamp: Date.now(),
        };
        await LocalStorage.setItem("cached_articles", JSON.stringify(cacheData));
        console.log("Articles cached successfully");

        // Show completion toast
        await showToast({
          style: Toast.Style.Success,
          title: "All articles loaded",
          message: `${finalArticles.length} articles fetched`,
        });
      })();
    }

    // Return initial articles immediately
    return firstPageArticles;
  } catch (error) {
    console.error("Error fetching articles:", error);

    // If there's an error, try to use cached data as fallback
    const cached = await LocalStorage.getItem<string>("cached_articles");
    if (cached) {
      try {
        const cachedData: CachedData = JSON.parse(cached);
        console.log("Using cached articles as fallback due to error");
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading fresh articles",
          message: "Using cached articles instead",
        });
        return cachedData.articles;
      } catch (parseError) {
        console.error("Error parsing cached data:", parseError);
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Error loading articles",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}
