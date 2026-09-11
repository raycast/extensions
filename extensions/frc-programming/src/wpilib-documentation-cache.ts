import { Cache } from "@raycast/api";

export function getCachedDocumentation<T>(cache: Cache, key: string): T | null {
  const cachedDocs = cache.get(key);
  if (typeof cachedDocs === "string") {
    try {
      return JSON.parse(cachedDocs) as T;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  return cachedDocs ?? null;
}
