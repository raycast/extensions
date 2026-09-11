import { Cache } from "@raycast/api";

const NOTRA_APP_URL = "https://app.usenotra.com";
const cache = new Cache({ namespace: "notra" });

export function notraUrl(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${NOTRA_APP_URL}${path}${sep}utm_source=raycast`;
}

export function getPostCacheKey(postId: string): string {
  return `post:${postId}`;
}

export function getPostsCacheKey(contentType: string): string {
  return `posts:v2:${contentType}`;
}

export function getCachedValue<T>(key: string): T | undefined {
  const value = cache.get(key);
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    cache.remove(key);
    return undefined;
  }
}

export function setCachedValue<T>(key: string, value: T): void {
  cache.set(key, JSON.stringify(value));
}

export function clearNotraCache(): void {
  cache.clear();
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
