import { Cache } from "@raycast/api";
import type { SubstackPost } from "../types/post";

const PUBLICATION_URL = "https://raycastweekly.substack.com";
const CACHE_KEY = "raycast-weekly-posts";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day in ms

const cache = new Cache();

const headers = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  Accept: "application/json",
};

function ensureReadingTime(post: SubstackPost): SubstackPost {
  return {
    ...post,
    reading_time: Math.ceil((post.wordcount || 0) / 200),
  };
}

export async function fetchPosts(): Promise<SubstackPost[]> {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    const { posts, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return (posts as SubstackPost[]).map(ensureReadingTime);
    }
  }

  const response = await fetch(`${PUBLICATION_URL}/api/v1/posts`, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`);
  }

  const data = (await response.json()) as SubstackPost[];
  const sortedPosts = data
    .map(ensureReadingTime)
    .sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime());

  cache.set(CACHE_KEY, JSON.stringify({ posts: sortedPosts, timestamp: Date.now() }));

  return sortedPosts;
}

export async function fetchPost(slug: string): Promise<SubstackPost> {
  const cacheKey = `post-${slug}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    const { post, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return ensureReadingTime(post);
    }
  }

  const response = await fetch(`${PUBLICATION_URL}/api/v1/posts/${slug}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.statusText}`);
  }

  const post = (await response.json()) as SubstackPost;
  const transformedPost = ensureReadingTime(post);

  cache.set(cacheKey, JSON.stringify({ post: transformedPost, timestamp: Date.now() }));

  return transformedPost;
}

export function getPostUrl(slug: string): string {
  return `${PUBLICATION_URL}/p/${slug}`;
}

export function getSubscribeUrl(): string {
  return `${PUBLICATION_URL}?utm_source=raycast&utm_medium=raycast-extension`;
}

export function clearCache(): void {
  cache.clear();
}
