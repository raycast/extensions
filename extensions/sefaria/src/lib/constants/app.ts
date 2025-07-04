/**
 * Keyboard shortcuts (not readonly to be compatible with Raycast API)
 */
const SHORTCUTS = {
  BACK: { modifiers: ["cmd"], key: "arrowLeft" },
  BACK_TO_CATEGORIES: { modifiers: ["cmd"], key: "arrowUp" },
  OPEN_BROWSER: { modifiers: ["cmd"], key: "o" },
  COPY_HEBREW: { modifiers: ["cmd"], key: "h" },
  COPY_ENGLISH: { modifiers: ["cmd"], key: "e" },
  COPY_ALL: { modifiers: ["cmd"], key: "a" },
  COPY_FOOTNOTES: { modifiers: ["cmd"], key: "f" },
};

/**
 * Application constants
 */

export const APP_CONSTANTS = {
  /**
   * Search configuration
   */
  SEARCH: {
    MAX_PREVIEW_LENGTH: 80,
    DEFAULT_SIZE: 20,
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
