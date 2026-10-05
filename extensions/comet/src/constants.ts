import { BookmarkSortOrder } from "./interfaces";

// Application paths
export const defaultCometProfilePath = ["Application Support", "Comet"];
export const defaultCometStatePath = ["Application Support", "Comet", "Local State"];

// Profile configuration
export const DEFAULT_COMET_PROFILE_ID = "Default";
export const COMET_PROFILE_KEY = "COMET_PROFILE_KEY";
export const COMET_ICON = "comet-icon.png";

// Bookmark sorting
export const COMET_BOOKMARK_SORT_ORDER = "BOOKMARK_SORT_ORDER";
export const DEFAULT_COMET_BOOKMARK_SORT_ORDER = "AddedAsc";
export const COMET_BOOKMARK_SORT_ORDERS: Record<BookmarkSortOrder, string> = {
  AddedAsc: "Date Added (ASC)",
  AddedDes: "Date Added (DES)",
};

// Error messages
export const NOT_INSTALLED_MESSAGE = "Comet browser not installed";
export const NO_BOOKMARKS_MESSAGE = "No bookmarks found in this profile";

// Memory limits
export const MEMORY_LIMITS = {
  HISTORY_RESULTS: 30,
  BOOKMARK_RESULTS: 100,
  TAB_RESULTS: 50,
  SEARCH_ALL_RESULTS: 50,
} as const;

// Legacy exports for backward compatibility
export const MAX_HISTORY_RESULTS = MEMORY_LIMITS.HISTORY_RESULTS;
export const MAX_BOOKMARK_RESULTS = MEMORY_LIMITS.BOOKMARK_RESULTS;
export const MAX_TAB_RESULTS = MEMORY_LIMITS.TAB_RESULTS;
export const MAX_SEARCH_ALL_RESULTS = MEMORY_LIMITS.SEARCH_ALL_RESULTS;

// Performance settings
export const PERFORMANCE = {
  DEBOUNCE_DELAY: 300, // ms
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Legacy exports for backward compatibility
export const DEBOUNCE_DELAY = PERFORMANCE.DEBOUNCE_DELAY;
export const CACHE_TTL = PERFORMANCE.CACHE_TTL;
export const MAX_RETRY_ATTEMPTS = PERFORMANCE.MAX_RETRY_ATTEMPTS;
export const RETRY_DELAY = PERFORMANCE.RETRY_DELAY;

// AppleScript timing constants
export const APPLESCRIPT_TIMING = {
  WINDOW_INIT_RETRY_LIMIT: 20,
  WINDOW_INIT_RETRY_DELAY: 0.1,
  WINDOW_ACTIVATION_DELAY: 0.2,
} as const;

// Legacy exports for backward compatibility
export const WINDOW_INIT_RETRY_LIMIT = APPLESCRIPT_TIMING.WINDOW_INIT_RETRY_LIMIT;
export const WINDOW_INIT_RETRY_DELAY = APPLESCRIPT_TIMING.WINDOW_INIT_RETRY_DELAY;
export const WINDOW_ACTIVATION_DELAY = APPLESCRIPT_TIMING.WINDOW_ACTIVATION_DELAY;

// Configuration validation
export const validateMemoryLimits = () => {
  const warnings: string[] = [];

  if (MEMORY_LIMITS.BOOKMARK_RESULTS < 1 || MEMORY_LIMITS.BOOKMARK_RESULTS > 1000) {
    warnings.push(`Bookmark result limit (${MEMORY_LIMITS.BOOKMARK_RESULTS}) outside recommended range (1-1000)`);
  }

  if (MEMORY_LIMITS.HISTORY_RESULTS < 1 || MEMORY_LIMITS.HISTORY_RESULTS > 500) {
    warnings.push(`History result limit (${MEMORY_LIMITS.HISTORY_RESULTS}) outside recommended range (1-500)`);
  }

  if (MEMORY_LIMITS.TAB_RESULTS < 1 || MEMORY_LIMITS.TAB_RESULTS > 200) {
    warnings.push(`Tab result limit (${MEMORY_LIMITS.TAB_RESULTS}) outside recommended range (1-200)`);
  }

  if (MEMORY_LIMITS.SEARCH_ALL_RESULTS < 1 || MEMORY_LIMITS.SEARCH_ALL_RESULTS > 100) {
    warnings.push(`Search all result limit (${MEMORY_LIMITS.SEARCH_ALL_RESULTS}) outside recommended range (1-100)`);
  }

  if (warnings.length > 0) {
    console.warn("Memory limit configuration warnings:", warnings);
  }

  return warnings;
};

// Validate configuration on module load
validateMemoryLimits();
