/**
 * Shared constants for file operations.
 */

export const MAX_FILENAME_LENGTH = 255;

/**
 * Maximum number of rename batches kept in history; when a new batch is
 * recorded beyond this, the oldest is dropped and can no longer be undone.
 * Each entry holds one command run, however many files it renamed.
 */
export const MAX_HISTORY_ENTRIES = 25;

export const STORAGE_KEYS = {
  HISTORY: "renaming-history",
} as const;
