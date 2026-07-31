import { Cache } from "@raycast/api";
import { CACHE_KEY, CACHE_TTL, POSTS_PAGE_SIZE, PUBLICATION_URL } from "../lib/constants";
import type { SubstackPost } from "../types/post";

const cache = new Cache();

const headers = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  Accept: "application/json",
};

type FetchPostsOptions = {
  limit?: number;
  offset?: number;
};

function ensureReadingTime(post: SubstackPost): SubstackPost {
  return {
    ...post,
    reading_time: Math.ceil((post.wordcount || 0) / 200),
  };
}

export async function fetchPosts({ limit = POSTS_PAGE_SIZE, offset = 0 }: FetchPostsOptions = {}): Promise<
  SubstackPost[]
> {
  const cacheKey = `${CACHE_KEY}-${limit}-${offset}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    const { posts, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return (posts as SubstackPost[]).map(ensureReadingTime);
    }
  }

  const response = await fetch(`${PUBLICATION_URL}/api/v1/posts?limit=${limit}&offset=${offset}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`);
  }

  const data = (await response.json()) as SubstackPost[];
  const sortedPosts = data
    .map(ensureReadingTime)
    .sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime());

  cache.set(cacheKey, JSON.stringify({ posts: sortedPosts, timestamp: Date.now() }));

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

export function clearPostsCache() {
  cache.clear();
}

export function getPostUrl(slug: string): string {
  return `${PUBLICATION_URL}/p/${slug}`;
}

export function getSubscribeUrl(): string {
  return `${PUBLICATION_URL}?utm_source=raycast&utm_medium=raycast-extension`;
}
