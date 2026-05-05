import { LocalStorage } from "@raycast/api";
import { TagStorage } from "../types";

// Cache for tags to avoid repeated expensive storage calls
let tagsCache: TagStorage | null = null;
let tagsCacheTimestamp = 0;
const TAGS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

const TAG_MAP_KEY = "tag-map";

// Force cache invalidation for debugging
let forceInvalidate = false;
let hasMigratedLegacyTags = false;

async function persistTagMap(tagMap: TagStorage): Promise<void> {
  const persistStart = Date.now();
  await LocalStorage.setItem(TAG_MAP_KEY, JSON.stringify(tagMap));
  const persistTime = Date.now() - persistStart;
  console.log(`[PERF] Persisted tag map (${Object.keys(tagMap).length} entries) in ${persistTime}ms`);
}

async function loadTagMapFromStorage(): Promise<TagStorage> {
  const readStart = Date.now();
  const stored = await LocalStorage.getItem<string>(TAG_MAP_KEY);
  const readTime = Date.now() - readStart;

  if (stored) {
    console.log(`[PERF] LocalStorage.getItem("${TAG_MAP_KEY}") completed in ${readTime}ms`);
    try {
      return JSON.parse(stored) as TagStorage;
    } catch {
      console.warn(`[PERF] Failed to parse tag map, falling back to legacy format`);
    }
  } else {
    console.log(`[PERF] LocalStorage.getItem("${TAG_MAP_KEY}") completed in ${readTime}ms (not found)`);
  }

  if (hasMigratedLegacyTags) {
    return {};
  }

  console.log(`[PERF] Attempting legacy tag migration via LocalStorage.allItems()`);
  const legacyStart = Date.now();
  const store = await LocalStorage.allItems();
  const legacyLoadTime = Date.now() - legacyStart;
  console.log(`[PERF] LocalStorage.allItems() (legacy) completed in ${legacyLoadTime}ms`);

  const tagMap: TagStorage = {};
  const parseStart = Date.now();
  for (const [key, value] of Object.entries(store)) {
    if (key === TAG_MAP_KEY) {
      continue;
    }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        tagMap[key] = parsed;
      }
    } catch {
      // Skip invalid tag data
    }
  }
  const parseTime = Date.now() - parseStart;
  console.log(`[PERF] Parsed ${Object.keys(tagMap).length} legacy tag entries in ${parseTime}ms`);

  await persistTagMap(tagMap);
  hasMigratedLegacyTags = true;
  return tagMap;
}

export async function loadTags(): Promise<TagStorage> {
  const startTime = Date.now();
  const now = Date.now();

  // Return cached result if still valid
  if (tagsCache && !forceInvalidate && now - tagsCacheTimestamp < TAGS_CACHE_DURATION) {
    console.log(`[PERF] Using cached tags (${Object.keys(tagsCache).length} entries) - ${Date.now() - startTime}ms`);
    return tagsCache;
  }

  console.log(`[PERF] Starting loadTags... (cache miss or expired)`);

  const tagMap = await loadTagMapFromStorage();
  const totalTime = Date.now() - startTime;
  console.log(`[PERF] loadTags completed in ${totalTime}ms`);

  // Cache the result
  tagsCache = tagMap;
  tagsCacheTimestamp = now;
  forceInvalidate = false;

  return tagMap;
}

export async function saveTags(appName: string, tags: string[]): Promise<void> {
  const startTime = Date.now();
  console.log(`[PERF] Saving tags for ${appName}...`);

  if (!tagsCache || forceInvalidate) {
    await loadTags();
  }

  const tagMap: TagStorage = { ...(tagsCache || {}) };
  if (tags.length > 0) {
    tagMap[appName] = tags;
  } else {
    delete tagMap[appName];
  }

  await persistTagMap(tagMap);

  tagsCache = tagMap;
  tagsCacheTimestamp = Date.now();
  forceInvalidate = false;

  const saveTime = Date.now() - startTime;
  console.log(`[PERF] saveTags completed in ${saveTime}ms`);
}

// Function to invalidate tags cache (useful for debugging)
export function invalidateTagsCache(): void {
  console.log(`[PERF] Invalidating tags cache`);
  tagsCache = null;
  tagsCacheTimestamp = 0;
  forceInvalidate = true;
}

export async function addTag(appName: string, currentTags: string[], newTag: string): Promise<string[]> {
  const startTime = Date.now();
  console.log(`[PERF] Adding tag "${newTag}" to ${appName}...`);

  const updatedTags = [...new Set([...currentTags, newTag])];
  await saveTags(appName, updatedTags);

  const totalTime = Date.now() - startTime;
  console.log(`[PERF] addTag completed in ${totalTime}ms`);
  return updatedTags;
}

export async function removeTag(appName: string, currentTags: string[], tagToRemove: string): Promise<string[]> {
  const startTime = Date.now();
  console.log(`[PERF] Removing tag "${tagToRemove}" from ${appName}...`);

  const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
  await saveTags(appName, updatedTags);

  const totalTime = Date.now() - startTime;
  console.log(`[PERF] removeTag completed in ${totalTime}ms`);
  return updatedTags;
}
