// This service is used to cache note metadata and make it reusable between
// commands of this extension. This means running a command will set the cache
// and the next command run can reuse the previously cached data.

import { Cache } from "@raycast/api";
import { Note } from "@/obsidian";
import { BYTES_PER_MEGABYTE } from "../../utils/constants";
import { Logger } from "../logger/logger.service";

const logger = new Logger("Cache");
const cache = new Cache({ capacity: BYTES_PER_MEGABYTE * 100 }); // 100MB for metadata only

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedNotesData {
  lastCached: number;
  notes: Note[];
}

export function setNotesInCache(cacheKey: string, notes: Note[]): void {
  const data: CachedNotesData = {
    lastCached: Date.now(),
    notes,
  };
  try {
    cache.set(cacheKey, JSON.stringify(data));
    logger.info(`Cached ${notes.length} notes for ${cacheKey}`);
  } catch (error) {
    logger.error(`Failed to cache notes. Error: ${error}`);
  }
}

/**
 * Gets notes from cache if available and not stale.
 */
export function getNotesFromCache(cacheKey: string): Note[] | null {
  if (!cache.has(cacheKey)) {
    logger.info(`No cache for ${cacheKey}`);
    return null;
  }

  try {
    const cached = cache.get(cacheKey);
    if (!cached) return null;

    const data: CachedNotesData = JSON.parse(cached);

    // Check if stale
    if (Date.now() - data.lastCached > CACHE_TTL) {
      logger.info(`Cache stale for ${cacheKey}`);
      return null;
    }

    // Convert lastModified back to Date objects after JSON parsing
    const notesWithDates = data.notes.map((note) => ({
      ...note,
      lastModified: new Date(note.lastModified),
    }));

    logger.info(`Using cached notes for ${cacheKey}`);
    return notesWithDates;
  } catch (error) {
    logger.error(`Failed to parse cached notes. Error: ${error}`);
    return null;
  }
}

/**
 * Invalidates the cache for a given vault.
 */
export function invalidateNotesCache(cacheKey: string): void {
  cache.remove(cacheKey);
  logger.info(`Invalidated cache for ${cacheKey}`);
}

/**
 * Updates a single note in the cache.
 */
export function updateNoteInCache(cacheKey: string, notePath: string, updates: Partial<Note>): void {
  const cached = getNotesFromCache(cacheKey);
  if (!cached) {
    logger.info(`No cache to update for ${cacheKey}`);
    return;
  }

  const updatedNotes = cached.map((note) => (note.path === notePath ? { ...note, ...updates } : note));

  setNotesInCache(cacheKey, updatedNotes);
  logger.info(`Updated note ${notePath} in cache`);
}

/**
 * Deletes a note from the cache.
 */
export function deleteNoteFromCache(cacheKey: string, notePath: string): void {
  const cached = getNotesFromCache(cacheKey);
  if (!cached) {
    logger.info(`No cache to delete from for ${cacheKey}`);
    return;
  }

  const filteredNotes = cached.filter((note) => note.path !== notePath);

  setNotesInCache(cacheKey, filteredNotes);
  logger.info(`Deleted note ${notePath} from cache`);
}

/**
 * Clears all cache entries.
 */
export function clearCache(): void {
  cache.clear();
  logger.info("Cleared all cache");
}
