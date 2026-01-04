/**
 * LocalStorage key constants
 * All keys are prefixed with "moji-art:" to avoid collisions with other extensions
 */
const PREFIX = "moji-art:";

export const STORAGE_KEYS = {
  favorites: `${PREFIX}favorites`,
  selectedType: `${PREFIX}selected-type`,
  selectedCategory: `${PREFIX}selected-category`,
  frecencyNamespace: `${PREFIX}frecency`,
  artsCache: `${PREFIX}arts-cache`,
  artsCacheTimestamp: `${PREFIX}arts-cache-timestamp`,
  customArts: `${PREFIX}custom-arts`,
} as const;

// Cache TTL: 1 hour
export const CACHE_TTL_MS = 1000 * 60 * 60;
