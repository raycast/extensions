export const DEFAULTS = {
  ACTIVE_INTERVAL_MINUTES: 25,
  IDLE_THRESHOLD_SECONDS: 180,
  ACHIEVEMENT_DISPLAY_DURATION_MS: 10000,
} as const;

export const STORAGE_KEYS = {
  ACTIVE_STATE: "time-awareness-active-state",
  CONFETTI_ENABLED: "time-awareness-confetti-enabled",
} as const;

export const ICONS = {
  IDLE_HEART: "🩶",
  ACHIEVEMENT: "🩷",
} as const;

export const MESSAGES = {
  ERROR: {
    ACTIVE_STATE_CHECK: "Failed to check active status",
    RESET_FAILED: "Failed to reset session",
    STORAGE_ERROR: "Failed to access storage",
  },
} as const;
