import { Keyboard } from "@raycast/api";

/**
 * Application-wide constants.
 * Centralizes magic numbers and strings for better maintainability and customizability.
 * Organized into UI, Network, Selectors, Shortcuts, and Cache categories.
 */
export const CONSTANTS = {
  /** Site configuration. */
  SITE: {
    BASE_URL: "https://animecountdown.com",
    USER_AGENT:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  },
  /** UI configuration defaults and limits. */
  UI: {
    DEFAULT_TRUNCATION_LENGTH: 50,
    DEFAULT_GRID_COLUMNS: 4,
    MIN_TRUNCATION_LENGTH: 10,
    MAX_TRUNCATION_LENGTH: 200,
  },
  /** Networking configuration including retry logic and timeout. */
  NETWORK: {
    RETRY: {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      retryableStatuses: [429, 500, 502, 503, 504],
    },
    TIMEOUT_MS: 30000,
  },
  /** CSS selectors used by the parser to scrape animecountdown.com. */
  SELECTORS: {
    ANIME_COUNTDOWN: {
      ITEM: "countdown-content-trending-items a.countdown-content-trending-item",
      TITLE: "countdown-content-trending-item-title",
      DESCRIPTION: "countdown-content-trending-item-desc",
      COUNTDOWN: "countdown-content-trending-item-countdown",
    },
  },
  /** Global keyboard shortcuts for extension actions. */
  SHORTCUTS: {
    TOGGLE_LAYOUT: { modifiers: ["cmd"], key: "l" } as Keyboard.Shortcut,
    TOGGLE_SORT: { modifiers: ["cmd"], key: "h" } as Keyboard.Shortcut,
    SWITCH_SECTION: { modifiers: ["cmd"], key: "s" } as Keyboard.Shortcut,
  },
  /** Cache keys and expiry settings for data persistence. */
  CACHE: {
    KEY: "anime-cache",
    EXPIRY_MS: 1000 * 60 * 60, // 1 hour
  },
};
