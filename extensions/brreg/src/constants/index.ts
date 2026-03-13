import type { Keyboard } from "@raycast/api";

// API Configuration
export const API_CONFIG = {
  BASE_URL: "https://virksomhet.brreg.no",
  SEARCH_ENDPOINT: "/oppslag/enheter",
  MIN_ORG_NUMBER_LENGTH: 9,
} as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS: Record<string, Keyboard.Shortcut> = {
  COPY_ORG_NUMBER: { modifiers: ["cmd"], key: "o" },
  COPY_ADDRESS: { modifiers: ["cmd"], key: "b" },
  COPY_REVENUE: { modifiers: ["cmd", "shift"], key: "r" },
  COPY_NET_RESULT: { modifiers: ["cmd", "shift"], key: "n" },
  OPEN_IN_BROWSER: { modifiers: ["cmd", "shift"], key: "enter" },
  ADD_TO_FAVORITES: { modifiers: ["cmd"], key: "f" },
  REMOVE_FROM_FAVORITES: { modifiers: ["cmd", "shift"], key: "f" },
  MOVE_UP: { modifiers: ["cmd", "shift"], key: "arrowUp" },
  MOVE_DOWN: { modifiers: ["cmd", "shift"], key: "arrowDown" },
  TOGGLE_MOVE_MODE: { modifiers: ["cmd", "shift"], key: "m" },
  SHOW_OVERVIEW: { modifiers: ["cmd"], key: "1" },
  SHOW_FINANCIALS: { modifiers: ["cmd"], key: "2" },
  SHOW_MAP: { modifiers: ["cmd"], key: "3" },
  PREVIOUS_TAB: { modifiers: [], key: "backspace" },
  GO_BACK: { modifiers: ["cmd"], key: "arrowLeft" },
};

// Emoji Categories
export const EMOJI_CATEGORIES = [
  { emoji: "⭐", label: "Star" },
  { emoji: "🏦", label: "Bank" },
  { emoji: "📈", label: "Growth" },
  { emoji: "🧪", label: "Test" },
  { emoji: "🛍️", label: "Retail" },
  { emoji: "🧑‍💻", label: "Tech" },
  { emoji: "🏗️", label: "Construction" },
  { emoji: "🏥", label: "Health" },
  { emoji: "🍽️", label: "Food" },
  { emoji: "⚙️", label: "Industry" },
] as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  FAVORITES: "favorites",
} as const;

// UI Text
export const UI_TEXT = {
  SEARCH_PLACEHOLDER: "Search for name or organisation number",
  MOVE_MODE_ACTIVE: "Move Mode Active - Use ⌘⇧↑↓ to reorder favorites",
  FAVORITES_SECTION: "Favorites",
  RESULTS_SECTION: "Results",
  MOVE_MODE_INDICATOR: " - Move Mode Active (⌘⇧)",
  COPY_SUCCESS: {
    ORG_NUMBER: "Organization number copied to clipboard",
    ADDRESS: "Address copied to clipboard",
    REVENUE: "Revenue copied to clipboard",
    NET_RESULT: "Net result copied to clipboard",
  },
} as const;

// Project Links
export const GITHUB_REPO_URL = "https://github.com/kyndig/brreg-search" as const;

// Markdown Content
export const WELCOME_MARKDOWN =
  `**Welcome to Brreg Search**\n\n- 🔍 Search for companies\n- ⭐ Favorite (⌘F) or remove (⌘⇧F) companies\n- 📑 See details (⌘↵) and cycle tabs (⌘1/2/3)\n\nHave feature requests or improvements? [Open an issue on GitHub](${GITHUB_REPO_URL}).` as const;

// Error Messages
export const ERROR_MESSAGES = {
  FETCH_ENTITIES: "Failed to fetch legal entities",
  LOAD_DETAILS: "Failed to load details",
  REFRESH_FAVICON: "Failed to refresh favicon",
  UNKNOWN_ERROR: "An unknown error occurred",
} as const;
