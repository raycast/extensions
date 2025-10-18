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
 * Store a meeting with its summary and transcript in the cache
 */
export async function cacheMeeting(
  meetingId: string,
  meeting: unknown,
  summary?: string,
  transcript?: string,
  actionItems?: unknown[],
): Promise<void> {
  const hash = generateHash(meetingId);
  const cacheKey = `${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${meetingId}`;

  const cached: CachedMeetingData = {
    meeting,
    summary,
    transcript,
    actionItems,
    cachedAt: Date.now(),
    hash,
  };

  await LocalStorage.setItem(cacheKey, JSON.stringify(cached));

  // Update index
  await updateMeetingIndex(meetingId);
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
 * Update the index of cached meeting IDs
 */
async function updateMeetingIndex(meetingId: string): Promise<void> {
  try {
    const indexData = await LocalStorage.getItem<string>(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    const index: CachedMeetingIndex = indexData ? JSON.parse(indexData) : { meetingIds: [], lastUpdated: Date.now() };

    if (!index.meetingIds.includes(meetingId)) {
      index.meetingIds.push(meetingId);
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
 * Get all cached meetings
 */
export async function getAllCachedMeetings(): Promise<CachedMeetingData[]> {
  const meetingIds = await getCachedMeetingIds();
  const meetings: CachedMeetingData[] = [];

  for (const id of meetingIds) {
    const cached = await getCachedMeeting(id);
    if (cached) {
      meetings.push(cached);
    }
  }

  return meetings;
}

/**
 * Clear old cache entries to maintain size limits
 * Keeps only the most recent N meetings
 */
export async function pruneCache(keepCount: number = 50): Promise<void> {
  try {
    const indexData = await LocalStorage.getItem<string>(CACHE_CONFIG.MEETINGS.INDEX_KEY);
    if (!indexData) return;

    const index: CachedMeetingIndex = JSON.parse(indexData);

    if (index.meetingIds.length <= keepCount) return;

    // Get all cached meetings with their dates
    const meetingsWithDates: Array<{ id: string; cachedAt: number }> = [];

    for (const id of index.meetingIds) {
      const cached = await getCachedMeeting(id);
      if (cached) {
        meetingsWithDates.push({ id, cachedAt: cached.cachedAt });
      }
    }

    // Sort by cachedAt (newest first) and keep only top N
    meetingsWithDates.sort((a, b) => b.cachedAt - a.cachedAt);
    const toKeep = meetingsWithDates.slice(0, keepCount).map((m) => m.id);
    const toRemove = index.meetingIds.filter((id) => !toKeep.includes(id));

    // Remove old entries
    for (const id of toRemove) {
      await LocalStorage.removeItem(`${CACHE_CONFIG.MEETINGS.KEY_PREFIX}${id}`);
    }

    // Update index
    index.meetingIds = toKeep;
    index.lastUpdated = Date.now();
    await LocalStorage.setItem(CACHE_CONFIG.MEETINGS.INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    logger.error("Error pruning cache:", error);
  }
}

/**
 * Update cache metadata
 */
export async function updateCacheMetadata(): Promise<void> {
  try {
    const meetings = await getAllCachedMeetings();

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
  if (!query || query.trim() === "") {
    return cachedMeetings;
  }

  const searchTerms = query.toLowerCase().split(/\s+/);

  return cachedMeetings.filter((cached) => {
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
}
