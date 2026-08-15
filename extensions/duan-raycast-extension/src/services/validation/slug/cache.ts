import { Cache } from "@raycast/api";

const CACHE_KEY = "duan-used-slugs";
const slugCache = new Cache();

export const getUsedSlugs = (): string[] => {
  const cached = slugCache.get(CACHE_KEY);
  try {
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export const setUsedSlugs = (slugs: string[]) => {
  slugCache.set(CACHE_KEY, JSON.stringify(slugs));
};

export const isSlugUsed = (slug: string): boolean => {
  return getUsedSlugs().includes(slug);
};
