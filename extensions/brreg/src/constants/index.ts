import type { Keyboard } from "@raycast/api";
import packageJson from "../../package.json";

const MODIFIER_SYMBOLS: Record<string, string> = {
  cmd: "⌘",
  shift: "⇧",
  ctrl: "⌃",
  alt: "⌥",
};

const KEY_SYMBOLS: Record<string, string> = {
  arrowUp: "↑",
  arrowDown: "↓",
  arrowLeft: "←",
  arrowRight: "→",
  enter: "↵",
  backspace: "⌫",
  tab: "⇥",
  space: "Space",
};

/**
 * Format a Raycast Keyboard.Shortcut to a human-readable symbol string (e.g. "⌘⇧C").
 * Handles both the plain { modifiers, key } variant and the cross-platform { macOS, Windows } variant.
 */
export function formatShortcut(shortcut: Keyboard.Shortcut): string {
  const resolved = "macOS" in shortcut ? shortcut.macOS : shortcut;
  const mods = (resolved.modifiers ?? []).map((m) => MODIFIER_SYMBOLS[m] ?? m).join("");
  const keyValue = String(resolved.key);
  const key = KEY_SYMBOLS[keyValue] ?? keyValue.toUpperCase();
  return `${mods}${key}`;
}

// API Configuration
export const API_CONFIG = {
  MIN_ORG_NUMBER_LENGTH: 9,
} as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  COPY_ORG_NUMBER: { modifiers: ["cmd", "shift"], key: "c" },
  COPY_VAT_NUMBER: { modifiers: ["cmd", "shift"], key: "v" },
  COPY_ADDRESS: { modifiers: ["cmd", "shift"], key: "b" },
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
} satisfies Record<string, Keyboard.Shortcut>;

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
  USER_SETTINGS: "user-settings",
  LAST_SEEN_CHANGELOG_VERSION: "last-seen-changelog-version",
} as const;

// UI Text
export const UI_TEXT = {
  SEARCH_PLACEHOLDER: "Search for name or organisation number",
  MOVE_MODE_ACTIVE: "Move Mode Active - Use ⌘⇧↑↓ to reorder favorites",
  FAVORITES_SECTION: "Favorites",
  MOVE_MODE_INDICATOR: " - Move Mode Active (⌘⇧)",
} as const;

// Project Links
export const GITHUB_REPO_URL = "https://github.com/kyndig/brreg-search" as const;

// App Metadata
export const APP_VERSION = packageJson.version;

// HTTP
export const USER_AGENT = `Raycast-Brreg-Search/${APP_VERSION} (${GITHUB_REPO_URL})` as const;

// Changelog
const CHANGELOG_HIGHLIGHTS_BY_VERSION: Readonly<Record<string, readonly string[]>> = {
  "1.0.0": [
    "Favorite companies for quick access and retrieval.",
    "Open company pages directly in Alle.as.",
    "Use keyboard shortcuts for faster search and navigation.",
  ],
  "1.0.1": [],
};

export const HAS_CHANGELOG_HIGHLIGHTS_FOR_CURRENT_VERSION = Object.hasOwn(CHANGELOG_HIGHLIGHTS_BY_VERSION, APP_VERSION);

const CHANGELOG_SHORTCUTS_HINT_MARKDOWN =
  "\n\n---\n`Enter` closes this changelog. `Shift+Enter` opens Keyboard Shortcuts.";

export function getChangelogMarkdown(version = APP_VERSION): string {
  const highlights = CHANGELOG_HIGHLIGHTS_BY_VERSION[version];
  if (!highlights || highlights.length === 0) {
    return `**Updated to version ${version}**\n\nSee the latest improvements and fixes in this release.${CHANGELOG_SHORTCUTS_HINT_MARKDOWN}`;
  }

  const lines = highlights.map((highlight) => `- ${highlight}`).join("\n");
  return `**Updated to version ${version}**\n\nKey features include:\n${lines}${CHANGELOG_SHORTCUTS_HINT_MARKDOWN}`;
}

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
