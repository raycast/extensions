import { Cache } from "@raycast/api";
import { CACHE_KEY } from "../constants";
import { Link } from "../types";

const cache = new Cache();

export function getCachedLinks(): Link[] | null {
  const cachedLinks = cache.get(CACHE_KEY);
  return cachedLinks ? JSON.parse(cachedLinks) : null;
}

export function setCachedLinks(links: Link[]): void {
  cache.set(CACHE_KEY, JSON.stringify(links));
}

export function clearCache(): void {
  cache.remove(CACHE_KEY);
}
