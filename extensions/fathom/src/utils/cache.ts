import { LocalStorage } from "@raycast/api";
import crypto from "crypto";
import { logger } from "@chrismessina/raycast-logger";

/**
 * Cache configuration for different data types
 */
const CACHE_CONFIG = {
  // Meetings with summaries/transcripts are immutable
  MEETINGS: {
    TTL: 30 * 24 * 60 * 60 * 1000, // 30 days
    KEY_PREFIX: "cache:meeting:",
    INDEX_KEY: "cache:meeting:index",
  },
  // Action items can change frequently
  ACTION_ITEMS: {
    TTL: 6 * 60 * 60 * 1000, // 6 hours
    KEY_PREFIX: "cache:action_items:",
  },
  // Metadata for cache management
  METADATA: {
    KEY: "cache:metadata",
  },
} as const;

export interface CachedMeetingData {
  meeting: unknown; // Will be Meeting type
  summary?: string;
  transcript?: string;
  actionItems?: unknown[]; // Will be ActionItem[]
  cachedAt: number;
  hash: string; // Hash of meeting ID + version
}

interface CacheMetadata {
  totalMeetings: number;
  oldestCachedAt: number;
  newestCachedAt: number;
  lastUpdated: number;
}

interface CachedMeetingIndex {
  meetingIds: string[];
  lastUpdated: number;
}

/**
 * Generate a content hash for cache validation
 */
function generateHash(meetingId: string): string {
  return crypto.createHash("sha256").update(meetingId).digest("hex").substring(0, 16);
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cachedAt: number, ttl: number): boolean {
  return Date.now() - cachedAt < ttl;
}

/**
 * Store a batch of meetings in the cache in one pass.
 * Writes all meeting items in parallel, then updates the index once.
 */
export async function cacheMeetingsBatch(
  meetings: Array<{
    meetingId: string;
    meeting: unknown;
    summary?: string;
    transcript?: string;
    actionItems?: unknown[];
  }>,
): Promise<void> {
  const now = Date.now();

  // Write all meeting entries in parallel
  await Promise.all(
    meetings.map(({ meetingId, meeting, summary, transcript, actionItems }) => {
      const cacheKey = `${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${meetingId}`;
      const cached: CachedMeetingData = {
        meeting,
        summary,
        transcript,
        actionItems,
        cachedAt: now,
        hash: generateHash(meetingId),
      };
      return LocalStorage.setItem(cacheKey, JSON.stringify(cached));
    }),
  );

  // Update index once for the whole batch
  const meetingIds = meetings.map((m) => m.meetingId);
  await updateMeetingIndexBatch(meetingIds);
}

/**
 * Store a meeting with its summary and transcript in the cache
 */
export async function cacheMeeting(
  meetingId: string,
  meeting: unknown,
  summary?: string,
  transcript?: string,
  actionItems?: unknown[],
): Promise<void> {
  await cacheMeetingsBatch([{ meetingId, meeting, summary, transcript, actionItems }]);
}

/**
 * Retrieve cached meeting data
 */
export async function getCachedMeeting(meetingId: string): Promise<CachedMeetingData | null> {
  const cacheKey = `${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${meetingId}`;

  try {
    const cached = await LocalStorage.getItem<string>(cacheKey);
    if (!cached) return null;

    const data = JSON.parse(cached) as CachedMeetingData;

    // Check if meeting cache is still valid
    if (!isCacheValid(data.cachedAt, CACHE_CONFIG.MEETINGS.TTL)) {
      await LocalStorage.removeItem(cacheKey);
      return null;
    }

    // Action items have shorter TTL - remove them if expired but keep meeting/summary/transcript
    if (data.actionItems && !isCacheValid(data.cachedAt, CACHE_CONFIG.ACTION_ITEMS.TTL)) {
      data.actionItems = undefined;
    }

    return data;
  } catch (error) {
    logger.error("Error reading cached meeting:", error);
    return null;
  }
}

/**
 * Update the index for a batch of meeting IDs (single read + single write)
 */
async function updateMeetingIndexBatch(meetingIds: string[]): Promise<void> {
  try {
    const indexData = await LocalStorage.getItem<string>(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    const index: CachedMeetingIndex = indexData ? JSON.parse(indexData) : { meetingIds: [], lastUpdated: Date.now() };

    let changed = false;
    for (const meetingId of meetingIds) {
      if (!index.meetingIds.includes(meetingId)) {
        index.meetingIds.push(meetingId);
        changed = true;
      }
    }

    if (changed) {
      index.lastUpdated = Date.now();
      await LocalStorage.setItem(CACHE_CONFIG.MEETINGS.INDEX_KEY, JSON.stringify(index));
    }
  } catch (error) {
    logger.error("Error updating meeting index:", error);
  }
}

/**
 * Get all cached meeting IDs
 */
export async function getCachedMeetingIds(): Promise<string[]> {
  try {
    const indexData = await LocalStorage.getItem<string>(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    if (!indexData) return [];

    const index: CachedMeetingIndex = JSON.parse(indexData);
    return index.meetingIds;
  } catch (error) {
    logger.error("Error reading meeting index:", error);
    return [];
  }
}

/**
 * Get all cached meetings — uses allItems() for a single bulk read instead of N individual reads.
 */
export async function getAllCachedMeetings(): Promise<CachedMeetingData[]> {
  try {
    const all = await LocalStorage.allItems();
    const prefix = CACHE_CONFIG.MEETINGS.KEY_PREFIX;
    const ttl = CACHE_CONFIG.MEETINGS.TTL;
    const actionItemsTtl = CACHE_CONFIG.ACTION_ITEMS.TTL;

    const meetings: CachedMeetingData[] = [];
    const expiredIds: string[] = [];

    for (const [key, value] of Object.entries(all)) {
      if (!key.startsWith(prefix)) continue;
      // Skip the index key itself
      if (key === CACHE_CONFIG.MEETINGS.INDEX_KEY) continue;

      try {
        const data = JSON.parse(value as string) as CachedMeetingData;

        if (!isCacheValid(data.cachedAt, ttl)) {
          expiredIds.push(key.slice(prefix.length));
          continue;
        }

        if (data.actionItems && !isCacheValid(data.cachedAt, actionItemsTtl)) {
          data.actionItems = undefined;
        }

        meetings.push(data);
      } catch {
        // Skip malformed entries
      }
    }

    // Prune expired entries from the index asynchronously (don't block return)
    if (expiredIds.length > 0) {
      pruneExpiredFromIndex(expiredIds).catch(() => {});
    }

    return meetings;
  } catch (error) {
    logger.error("Error reading all cached meetings:", error);
    return [];
  }
}

/**
 * Remove expired IDs from the index (background cleanup)
 */
async function pruneExpiredFromIndex(expiredIds: string[]): Promise<void> {
  try {
    const indexData = await LocalStorage.getItem<string>(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    if (!indexData) return;
    const index: CachedMeetingIndex = JSON.parse(indexData);
    const expiredSet = new Set(expiredIds);
    index.meetingIds = index.meetingIds.filter((id) => !expiredSet.has(id));
    index.lastUpdated = Date.now();
    await LocalStorage.setItem(CACHE_CONFIG.MEETINGS.INDEX_KEY, JSON.stringify(index));
    await Promise.all(expiredIds.map((id) => LocalStorage.removeItem(`${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${id}`)));
  } catch (error) {
    logger.error("Error pruning expired meetings from index:", error);
  }
}

/**
 * Clear old cache entries to maintain size limits
 * Keeps only the most recent N meetings
 */
export async function pruneCache(keepCount: number = 50): Promise<void> {
  try {
    const meetings = await getAllCachedMeetings();
    if (meetings.length <= keepCount) return;

    // Sort by cachedAt descending, keep newest N
    meetings.sort((a, b) => b.cachedAt - a.cachedAt);
    const toRemove = meetings.slice(keepCount);
    const toKeep = meetings.slice(0, keepCount);

    const getMeetingId = (m: CachedMeetingData): string => {
      const meeting = m.meeting as { recordingId?: string; id?: string };
      return meeting.recordingId || meeting.id || "";
    };

    await Promise.all(
      toRemove.map((m) => {
        const id = getMeetingId(m);
        return id ? LocalStorage.removeItem(`${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${id}`) : Promise.resolve();
      }),
    );

    // Rewrite index with only kept IDs
    const keptIds = toKeep.map(getMeetingId).filter(Boolean);
    const index: CachedMeetingIndex = { meetingIds: keptIds, lastUpdated: Date.now() };
    await LocalStorage.setItem(CACHE_CONFIG.MEETINGS.INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    logger.error("Error pruning cache:", error);
  }
}

/**
 * Update cache metadata from in-memory meetings (avoids re-reading from storage)
 */
export async function updateCacheMetadataFromMeetings(meetings: CachedMeetingData[]): Promise<void> {
  try {
    if (meetings.length === 0) {
      await LocalStorage.removeItem(CACHE_CONFIG.METADATA.KEY);
      return;
    }

    const cachedTimes = meetings.map((m) => m.cachedAt);
    const metadata: CacheMetadata = {
      totalMeetings: meetings.length,
      oldestCachedAt: Math.min(...cachedTimes),
      newestCachedAt: Math.max(...cachedTimes),
      lastUpdated: Date.now(),
    };

    await LocalStorage.setItem(CACHE_CONFIG.METADATA.KEY, JSON.stringify(metadata));
  } catch (error) {
    logger.error("Error updating cache metadata:", error);
  }
}

/**
 * Update cache metadata
 */
export async function updateCacheMetadata(): Promise<void> {
  const meetings = await getAllCachedMeetings();
  await updateCacheMetadataFromMeetings(meetings);
}

/**
 * Get cache metadata
 */
export async function getCacheMetadata(): Promise<CacheMetadata | null> {
  try {
    const data = await LocalStorage.getItem<string>(CACHE_CONFIG.METADATA.KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error("Error reading cache metadata:", error);
    return null;
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const meetingIds = await getCachedMeetingIds();

    for (const id of meetingIds) {
      await LocalStorage.removeItem(`${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${id}`);
    }

    await LocalStorage.removeItem(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    await LocalStorage.removeItem(CACHE_CONFIG.METADATA.KEY);
  } catch (error) {
    logger.error("Error clearing cache:", error);
  }
}

/**
 * Perform full-text search over cached meetings
 * Searches titles, summaries, and transcripts
 */
export function searchCachedMeetings(cachedMeetings: CachedMeetingData[], query: string): CachedMeetingData[] {
  if (!query.trim()) {
    return cachedMeetings;
  }

  const searchTerms = query.toLowerCase().split(/\s+/);
  logger.log(`[searchCachedMeetings] Searching ${cachedMeetings.length} meetings for: "${query}"`);

  const results = cachedMeetings.filter((cached) => {
    const meeting = cached.meeting as { title?: string; meetingTitle?: string };
    const searchableText = [
      meeting.title || "",
      meeting.meetingTitle || "",
      cached.summary || "",
      cached.transcript || "",
    ]
      .join(" ")
      .toLowerCase();

    return searchTerms.every((term) => searchableText.includes(term));
  });

  logger.log(`[searchCachedMeetings] Found ${results.length} matches`);
  return results;
}
