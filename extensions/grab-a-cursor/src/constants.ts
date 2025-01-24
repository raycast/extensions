export const CURSOR_DEFAULTS = {
  INITIAL_POSITION: { x: 0, y: 0 },
  MOVEMENT_SPEED: 5,
  UPDATE_INTERVAL: 16,
  Z_INDEX: 9999,
};

export const ERROR_MESSAGES = {
  INITIALIZATION_FAILED: "Failed to initialize cursor",
  INVALID_POSITION: "Invalid cursor position provided",
  MOVEMENT_ERROR: "Error occurred while moving cursor",
};

export const DISPLAY_SIZE_TO_ITEMS = {
  small: 8,
  medium: 6,
  large: 4,
} as const;

export const USAGE_STATS_KEY = "cursor-usage-statistics";
export const SVG_FILE_EXTENSION = ".svg";

export const PATHS = {
  CURSORS_ROOT: "cursors",
} as const;

export const SEARCH = {
  PLACEHOLDER: "Search cursors",
  ERROR_TITLE: "Error",
} as const;
