// DTF API Client
// Centralized API client with unified configuration

import { Cache } from "@raycast/api";
import {
  ApiResponse,
  TimelineResult,
  NewsResult,
  SearchResult,
  Post,
  TimelineItem,
  DisplayPost,
  Subsite,
  TopicsResult,
  TopicSubsite,
  BlogsApiResponse,
  BlogData,
  getMediaItems,
} from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

export const API_CONFIG = {
  BASE_URL: "https://api.dtf.ru",
  VERSION: "v2.10",
  TIMEOUT_MS: 15000, // 15 seconds timeout
  IMAGE_CDN: "https://leonardo.osnova.io",
} as const;

// Cache configuration
const CACHE_CONFIG = {
  TOPICS_KEY: "dtf_topics",
  TOPICS_TTL: 24 * 60 * 60 * 1000, // 24 hours
  BLOGS_KEY: "dtf_blogs",
  BLOGS_TTL: 60 * 60 * 1000, // 1 hour
} as const;

// =============================================================================
// HELPERS
// =============================================================================

const cache = new Cache();

/**
 * Build full API URL
 */
export function buildUrl(endpoint: string, params?: URLSearchParams): string {
  const url = `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}${endpoint}`;
  return params ? `${url}?${params}` : url;
}

/**
 * Build image URL from UUID
 */
export function buildImageUrl(uuid: string, size = 100): string {
  return `${API_CONFIG.IMAGE_CDN}/${uuid}/-/preview/${size}/`;
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generic API request with timeout and error handling
 */
interface RequestOptions {
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers["jwtauthorization"] = `Bearer ${options.token}`;
  }

  const url = `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}${endpoint}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as T & { error?: { code: string }; message?: string };

    if (data.error) {
      throw new Error(data.message || `API Error: ${data.error.code}`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout - check your internet connection");
      }
      if (error.message.includes("ENOTFOUND") || error.message.includes("fetch failed")) {
        throw new Error("Network error - check your internet connection");
      }
    }
    throw error;
  }
}

// =============================================================================
// TRANSFORMERS
// =============================================================================

/**
 * Transform API Post to DisplayPost
 */
export function transformPost(post: Post): DisplayPost {
  // Find cover image from blocks
  let coverImage: string | undefined;
  const coverBlock = post.blocks?.find((b) => b.cover && b.type === "media");
  const coverMediaItems = coverBlock ? getMediaItems(coverBlock.data?.items) : undefined;
  if (coverMediaItems?.[0]?.image?.data?.uuid) {
    coverImage = buildImageUrl(coverMediaItems[0].image.data.uuid, 400);
  }

  // Extract text excerpt
  let excerpt: string | undefined;
  const textBlock = post.blocks?.find((b) => b.type === "text" && b.data?.text);
  if (textBlock?.data?.text) {
    excerpt = textBlock.data.text
      .replaceAll(/<[^>]*>/g, "")
      .slice(0, 200)
      .trim();
    if (excerpt.length === 200) excerpt += "...";
  }

  // Check if post is from personal blog (author === subsite)
  const authorId = post.author?.id;
  const subsiteId = post.subsite?.id || post.subsiteId;
  const isPersonalBlog = authorId === subsiteId;

  return {
    id: post.id,
    title: post.title || "No title",
    url: post.url || `https://dtf.ru/${post.id}`,
    date: new Date(post.date * 1000),
    author: {
      name: post.author?.name || "Anonymous",
      avatar: post.author?.avatar?.data?.uuid ? buildImageUrl(post.author.avatar.data.uuid) : undefined,
    },
    subsite: isPersonalBlog
      ? { id: subsiteId, name: "", avatar: undefined }
      : {
          id: subsiteId,
          name: post.subsite?.name || "DTF",
          avatar: post.subsite?.avatar?.data?.uuid ? buildImageUrl(post.subsite.avatar.data.uuid) : undefined,
        },
    stats: {
      views: post.counters?.views || 0,
      comments: post.counters?.comments || 0,
      likes: post.likes?.counterLikes || 0,
    },
    coverImage,
    excerpt,
    blocks: post.blocks,
  };
}

/**
 * Transform timeline items to DisplayPosts
 */
export function transformTimelineItems(items: TimelineItem[]): DisplayPost[] {
  return items.filter((item) => item.type === "entry").map((item) => transformPost(item.data));
}

// =============================================================================
// API METHODS
// =============================================================================

/**
 * Get timeline (latest posts)
 */
export async function getTimeline(
  lastId?: number,
  sorting: "date" | "hotness" = "date",
): Promise<{ posts: DisplayPost[]; lastId?: number; cursor?: string }> {
  const params = new URLSearchParams({ markdown: "false", sorting });
  if (lastId) params.set("lastId", String(lastId));

  const data = await request<ApiResponse<TimelineResult>>(`/timeline?${params}`);

  return {
    posts: transformTimelineItems(data.result.items),
    lastId: data.result.lastId,
    cursor: data.result.cursor,
  };
}

/**
 * Get popular posts
 */
export async function getPopularPosts(period?: "day" | "week" | "month"): Promise<DisplayPost[]> {
  const params = new URLSearchParams({
    markdown: "false",
    sorting: "hotness",
    pageName: "popular",
    isWithoutNews: "true",
  });
  if (period) params.set("date", period);

  const data = await request<ApiResponse<TimelineResult>>(`/feed?${params}`);

  return transformTimelineItems(data.result.items);
}

/**
 * Get fresh posts
 */
export async function getFreshPosts(
  sorting: "from-10" | "from5" | "from10" | "all" = "from-10",
): Promise<DisplayPost[]> {
  const params = new URLSearchParams({
    markdown: "false",
    sorting,
    pageName: "new",
    isWithoutNews: "true",
  });

  const data = await request<ApiResponse<TimelineResult>>(`/feed?${params}`);

  return transformTimelineItems(data.result.items);
}

/**
 * Get news
 */
export async function getNews(
  lastId?: number,
  lastSortingValue?: number,
): Promise<{ posts: DisplayPost[]; lastId?: number }> {
  const params = new URLSearchParams({ markdown: "false" });
  if (lastId) params.set("lastId", String(lastId));
  if (lastSortingValue) params.set("lastSortingValue", String(lastSortingValue));

  const data = await request<ApiResponse<NewsResult>>(`/news?${params}`);

  return {
    posts: data.result.news.map((post) => transformPost(post)),
    lastId: data.result.lastId,
  };
}

/**
 * Get subsite posts
 */
export async function getSubsitePosts(
  subsiteId: number,
  sorting: "date" | "hotness" = "date",
): Promise<{ posts: DisplayPost[]; cursor?: string }> {
  const params = new URLSearchParams({
    markdown: "false",
    sorting,
    subsitesIds: String(subsiteId),
  });

  const data = await request<ApiResponse<TimelineResult>>(`/timeline?${params}`);

  return {
    posts: transformTimelineItems(data.result.items),
    cursor: data.result.cursor,
  };
}

/**
 * Search posts
 */
export async function searchPosts(query: string): Promise<DisplayPost[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    query: query.trim(),
    order_by: "relevant",
  });

  const data = await request<ApiResponse<SearchResult>>(`/search?${params}`);

  // Search result structure may vary
  const items = (data as unknown as SearchResult).items || data.result?.items || [];

  return items
    .filter((item: TimelineItem) => item.type === "entry")
    .map((item: TimelineItem) => transformPost(item.data));
}

/**
 * Get subsite info
 */
export async function getSubsiteInfo(subsiteId: number): Promise<Subsite | null> {
  try {
    const data = await request<ApiResponse<Subsite>>(`/subsite?id=${subsiteId}`);
    return data.result;
  } catch {
    return null;
  }
}

// =============================================================================
// CACHED API METHODS
// =============================================================================

interface CachedData<T> {
  data: T;
  timestamp: number;
}

function getCachedData<T>(key: string, ttl: number): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  try {
    const parsed: CachedData<T> = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    if (age < ttl) {
      return parsed.data;
    }
  } catch {
    // Cache corrupted
  }
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  const cacheData: CachedData<T> = { data, timestamp: Date.now() };
  cache.set(key, JSON.stringify(cacheData));
}

/**
 * Get topics (cached for 24 hours)
 */
export async function getTopics(forceRefresh = false): Promise<TopicSubsite[]> {
  if (!forceRefresh) {
    const cached = getCachedData<TopicSubsite[]>(CACHE_CONFIG.TOPICS_KEY, CACHE_CONFIG.TOPICS_TTL);
    if (cached) return cached;
  }

  const url = buildUrl("/discovery/topics");
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TopicsResult;
  const topics = data.result.map((item) => item.data);

  setCachedData(CACHE_CONFIG.TOPICS_KEY, topics);
  return topics;
}

/**
 * Get top blogs (cached for 1 hour)
 */
export async function getTopBlogs(forceRefresh = false): Promise<BlogData[]> {
  if (!forceRefresh) {
    const cached = getCachedData<BlogData[]>(CACHE_CONFIG.BLOGS_KEY, CACHE_CONFIG.BLOGS_TTL);
    if (cached) return cached;
  }

  const url = buildUrl("/discovery/blogs");
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as BlogsApiResponse;
  const blogs = data.result.map((item) => item.data);

  setCachedData(CACHE_CONFIG.BLOGS_KEY, blogs);
  return blogs;
}
