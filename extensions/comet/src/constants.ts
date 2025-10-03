import { BookmarkSortOrder } from "./interfaces";

export const defaultCometProfilePath = ["Application Support", "Comet"];
export const defaultCometStatePath = ["Application Support", "Comet", "Local State"];
export const DEFAULT_COMET_PROFILE_ID = "Default";
export const COMET_PROFILE_KEY = "COMET_PROFILE_KEY";
export const COMET_ICON = "comet-icon.png";
export const COMET_BOOKMARK_SORT_ORDER = "BOOKMARK_SORT_ORDER";
export const DEFAULT_COMET_BOOKMARK_SORT_ORDER = "AddedAsc";
export const COMET_BOOKMARK_SORT_ORDERS: Record<BookmarkSortOrder, string> = {
  AddedAsc: "Date Added (ASC)",
  AddedDes: "Date Added (DES)",
};

export const NOT_INSTALLED_MESSAGE = "Comet browser not installed";
export const NO_BOOKMARKS_MESSAGE = "No bookmarks found in this profile";

// Maximum results to prevent memory issues
export const MAX_HISTORY_RESULTS = 30;
export const MAX_BOOKMARK_RESULTS = 100;
export const MAX_TAB_RESULTS = 50;
export const MAX_SEARCH_ALL_RESULTS = 50;

// Performance optimization constants
export const DEBOUNCE_DELAY = 300; // ms
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000; // 1 second

// AppleScript timing constants
export const WINDOW_INIT_RETRY_LIMIT = 20;
export const WINDOW_INIT_RETRY_DELAY = 0.1;
export const WINDOW_ACTIVATION_DELAY = 0.2;
