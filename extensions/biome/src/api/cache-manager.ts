import { Cache } from "@raycast/api";
import { BiomeRulesCache } from "../types/biome-schema";

const cacheKey = "biome-rules-cache";
const cacheTtlMs = 24 * 60 * 60 * 1000; // 24 hours

const cache = new Cache();

export function getCachedRules(): BiomeRulesCache | null {
  try {
    const cached = cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    const data: BiomeRulesCache = JSON.parse(cached);

    // Check if cache is still valid
    const now = Date.now();
    const age = now - data.fetchedAt;

    if (age > cacheTtlMs) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

export function setCachedRules(data: BiomeRulesCache): void {
  try {
    cache.set(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

export function clearCache(): void {
  try {
    cache.remove(cacheKey);
  } catch (error) {
    console.error("Cache clear error:", error);
  }
}
