import { Keyboard } from "@raycast/api";

/**
 * Keyboard shortcuts (properly typed for Raycast API)
 */
const SHORTCUTS = {
  BACK: { modifiers: ["cmd" as const], key: "arrowLeft" as const },
  BACK_TO_CATEGORIES: { modifiers: ["cmd" as const], key: "arrowUp" as const },
  OPEN_BROWSER: { modifiers: ["cmd" as const], key: "o" as const },
  COPY_HEBREW: { modifiers: ["cmd" as const], key: "h" as const },
  COPY_ENGLISH: { modifiers: ["cmd" as const], key: "e" as const },
  COPY_ALL: { modifiers: ["cmd" as const, "shift" as const], key: "a" as const },
  COPY_FOOTNOTES: { modifiers: ["cmd" as const], key: "f" as const },
} satisfies Record<string, Keyboard.Shortcut>;

/**
 * Application constants
 */

export const APP_CONSTANTS = {
  /**
   * Search configuration
   */
  SEARCH: {
    MAX_PREVIEW_LENGTH: 80,
    DEFAULT_PAGE_SIZE: 20,
    CATEGORY_SEARCH_SIZE: 100,
    COPY_ACTION_PREVIEW_LENGTH: 30,
    HIGHLIGHTED_TEXT_PREVIEW_LENGTH: 25,
  },

  /**
   * API configuration
   */
  API: {
    REQUEST_TIMEOUT_MS: 10000, // 10 seconds
    BATCH_SIZE: 10,
  },

  /**
   * Text processing
   */
  TEXT: {
    RTL_MARKER_START: "\u200F",
    RTL_MARKER_END: "\u200E",
  },

  /**
   * UI Messages
   */
  MESSAGES: {
    LOADING: {
      SEARCH: "🔄 Searching Sefaria...",
      SOURCE: "🔄 Loading Source...",
      GENERAL: "Please wait...",
    },
    ERROR: {
      SEARCH_FAILED: "Search failed",
      SOURCE_FAILED: "Failed to get source",
      NO_RESULTS: "No results found",
      REFERENCE_EMPTY: "Reference cannot be empty",
      GENERAL_ERROR: "❌ Error",
    },
    SUCCESS: {
      NO_RESULTS_TITLE: "No results found",
      START_TYPING: "Start typing to search Sefaria",
      START_TYPING_SUBTITLE: "Search for texts, commentaries, and sources",
    },
  },

  /**
   * Icons
   */
  ICONS: {
    SEARCH: "📚",
    ERROR: "❌",
    LOADING: "🔄",
    NO_RESULTS: "📭",
    VIEW_SOURCE: "📖",
  },

  /**
   * Keyboard shortcuts
   */
  SHORTCUTS,

  /**
   * URLs
   */
  URLS: {
    SEFARIA_BASE: "https://www.sefaria.org",
    SEFARIA_SEARCH: "https://www.sefaria.org/search",
  },
} as const;

/**
 * Language codes
 */
export const LANGUAGES = {
  HEBREW: "he",
  ENGLISH: "en",
} as const;

/**
 * Text processing regex patterns
 */
export const REGEX_PATTERNS = {
  HTML_TAGS: /<[^>]*>/g,
  HTML_ENTITIES: {
    NBSP: /&nbsp;/g,
    AMP: /&amp;/g,
    LT: /&lt;/g,
    GT: /&gt;/g,
    QUOT: /&quot;/g,
    APOS: /&#39;/g,
    APOS_ALT: /&#x27;/g,
    HELLIP: /&hellip;/g,
    THINSP: /&thinsp;/g,
    ENSP: /&ensp;/g,
    EMSP: /&emsp;/g,
  },
  UNICODE_CONTROL: /[\u200E\uFEFF\u200B]/g,
  WHITESPACE: /\s+/g,
  BOLD_TAGS: /<\/?b>/g,
  FOOTNOTES: {
    BETWEEN_ASTERISKS: /\*([^*]+)\*/g,
    END_ASTERISK: /\*([^*]+)$/,
    STANDALONE_ASTERISK: /\*/g,
  },
} as const;
