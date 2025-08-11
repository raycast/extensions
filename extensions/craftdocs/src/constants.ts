export const CACHE_KEYS = {
  SEARCH_SPACE_ID: "searchSpaceId",
  DAILY_NOTES_SPACE_ID: "dailyNotesSpaceId",
} as const;

export const APP_CONSTANTS = {
  DEFAULT_SPACE_FILTER: "all",
} as const;

// Craft URL scheme position constants
// Using 999999 for "end" position follows Craft's native URL scheme approach.
// This may change in the future if Craft adds an API for external developers.
export const APPEND_POSITIONS = {
  BEGINNING: "0",
  END: "999999",
} as const;
