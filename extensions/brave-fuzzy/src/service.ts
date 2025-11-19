/**
 * Brave Browser Raycast Extension Service
 *
 * This service provides core functionality for the Brave Browser Raycast extension,
 * including tab retrieval, history management, and tab focusing capabilities.
 *
 * Key features:
 * - Retrieves open tabs from Brave Browser windows via AppleScript
 * - Manages a local copy of the history database to avoid locking issues
 * - Focuses existing tabs by window/tab index using AppleScript
 * - Provides search functionality across tabs and history
 */

import { execSync, exec } from "node:child_process";
import { existsSync, copyFileSync, mkdirSync, statSync } from "node:fs";
import { promisify } from "node:util";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { Icon } from "@raycast/api";

// Promisified exec for async operations
const execAsync = promisify(exec);

/**
 * Cache interface for storing data with timestamp
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Simple in-memory cache with TTL support
 */
const cache: {
  tabs?: CacheEntry<SearchItem[]>;
  history?: CacheEntry<SearchItem[]>;
} = {};

/**
 * Cache TTL constants (in milliseconds)
 */
const CACHE_TTL = {
  TABS: 5000, // 5 seconds - tabs change frequently
  HISTORY: 30000, // 30 seconds - aligns with DB copy refresh
};

/**
 * Checks if a cache entry is still valid
 */
const isCacheValid = <T>(entry: CacheEntry<T> | undefined, ttl: number): boolean => {
  return entry !== undefined && Date.now() - entry.timestamp < ttl;
};

/**
 * Represents a searchable item from tabs, history, or search suggestions
 */
export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  type: "tab" | "history" | "search";
  icon: Icon;
  accessory?: string;
  // Additional metadata for tabs to enable precise focusing
  windowIndex?: number;
  tabIndex?: number;
}

/**
 * User preferences for the extension
 */
export interface Preferences {
  searchEngine: string;
}

/**
 * Manages a local copy of the Brave history database to avoid locking issues.
 *
 * The main Brave history database is often locked when the browser is running,
 * causing SQLite access to fail. This function creates and maintains a temporary
 * copy of the database that can be safely read without conflicts.
 *
 * The copy is updated every 30 seconds when needed, and falls back to existing
 * copies if the original database is locked during update attempts.
 *
 * @returns The path to the copied history database, or null if unavailable
 */
const getHistoryDatabaseCopy = (): string | null => {
  try {
    const originalHistoryPath = join(
      homedir(),
      "Library/Application Support/BraveSoftware/Brave-Browser/Default/History"
    );

    if (!existsSync(originalHistoryPath)) {
      console.log("service::getHistoryDatabaseCopy::Debug::Original history file not found");
      return null;
    }

    // Create temp directory for our copy
    const tempDir = join(tmpdir(), "brave-fuzzy-history");
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    const copyPath = join(tempDir, "History");
    const shouldUpdate = !existsSync(copyPath) || Date.now() - statSync(copyPath).mtime.getTime() > 30000; // Update every 30 seconds

    if (shouldUpdate) {
      console.log("service::getHistoryDatabaseCopy::Debug::Updating history copy");
      try {
        // Copy the database file
        copyFileSync(originalHistoryPath, copyPath);
        console.log("service::getHistoryDatabaseCopy::Log::History copy updated successfully");
      } catch (copyError) {
        console.log("service::getHistoryDatabaseCopy::Debug::Copy failed, database likely locked", {
          error: String(copyError),
        });
        // If copy fails but we have an existing copy, use it
        if (existsSync(copyPath)) {
          console.log("service::getHistoryDatabaseCopy::Debug::Using existing copy");
          return copyPath;
        }
        return null;
      }
    }

    return copyPath;
  } catch (error) {
    console.log("service::getHistoryDatabaseCopy::Error::Failed to manage history copy", {
      error: String(error),
    });
    return null;
  }
};

/**
 * Retrieves all open tabs from Brave Browser windows using AppleScript.
 *
 * This function communicates with Brave Browser to enumerate all windows and tabs,
 * collecting title, URL, window index, and tab index for each tab. The data is
 * formatted using triple-pipe delimiters to handle tab titles that contain
 * standard pipe characters.
 *
 * The window and tab indices are used later for precise tab focusing via AppleScript.
 *
 * @returns Promise resolving to array of SearchItem objects representing open tabs
 */
export const getBraveTabs = async (): Promise<SearchItem[]> => {
  try {
    // Check cache first
    if (isCacheValid(cache.tabs, CACHE_TTL.TABS)) {
      console.log("service::getBraveTabs::Debug::Returning cached tabs");
      return cache.tabs.data;
    }

    const braveConfigPath = join(homedir(), "Library/Application Support/BraveSoftware/Brave-Browser/Default/Sessions");
    if (!existsSync(braveConfigPath)) {
      console.log("service::getBraveTabs::Debug::Brave config path not found");
      return [];
    }

    // AppleScript to enumerate all tabs across all windows
    // Uses triple-pipe delimiter to handle tab titles containing single pipes
    const applescriptCommand = `
      tell application "Brave Browser"
        set tabList to {}
        set windowIndex to 1
        repeat with w in windows
          set tabIndex to 1
          repeat with t in tabs of w
            set end of tabList to (name of t & "|||" & URL of t & "|||" & windowIndex & "|||" & tabIndex)
            set tabIndex to tabIndex + 1
          end repeat
          set windowIndex to windowIndex + 1
        end repeat
        return tabList
      end tell
    `;

    const { stdout } = await execAsync(`osascript -e '${applescriptCommand}'`);
    const tabEntries = stdout.trim().split(", ");

    console.log("service::getBraveTabs::Debug::Raw AppleScript result", {
      entryCount: tabEntries.length,
    });

    const tabs: SearchItem[] = [];

    // Parse AppleScript output and create SearchItem objects
    for (let i = 0; i < tabEntries.length; i++) {
      const parts = tabEntries[i].split("|||");

      // Ensure we have all required parts (title, url, windowIndex, tabIndex)
      if (parts.length === 4) {
        const [title, url, windowIndex, tabIndex] = parts;
        tabs.push({
          id: `tab-${i}`,
          title: title.trim(),
          subtitle: url.trim(),
          url: url.trim(),
          type: "tab",
          icon: Icon.Globe,
          accessory: "Active Tab",
          // Store indices for precise tab focusing
          windowIndex: Number.parseInt(windowIndex.trim(), 10),
          tabIndex: Number.parseInt(tabIndex.trim(), 10),
        });
      }
    }

    console.log("service::getBraveTabs::Debug::Retrieved tabs", {
      count: tabs.length,
    });

    // Cache the results
    cache.tabs = {
      data: tabs,
      timestamp: Date.now(),
    };

    return tabs;
  } catch (error) {
    console.log("service::getBraveTabs::Error::Failed to get tabs", {
      error: String(error),
    });
    return [];
  }
};

/**
 * Retrieves browser history from Brave Browser's local database copy.
 *
 * Uses the temporary database copy created by getHistoryDatabaseCopy() to avoid
 * locking conflicts. Queries the most recent 50 visited URLs with their titles
 * and visit counts.
 *
 * URLs are validated and formatted to ensure they include proper protocols.
 * Invalid or empty URLs are filtered out.
 *
 * @returns Promise resolving to array of SearchItem objects representing browser history
 */
export const getBraveHistory = async (): Promise<SearchItem[]> => {
  try {
    // Check cache first
    if (isCacheValid(cache.history, CACHE_TTL.HISTORY)) {
      console.log("service::getBraveHistory::Debug::Returning cached history");
      return cache.history.data;
    }

    const historyPath = getHistoryDatabaseCopy();
    if (!historyPath) {
      console.log("service::getBraveHistory::Debug::History database copy not available");
      return [];
    }

    const query = `
      SELECT title, url, visit_count, last_visit_time
      FROM urls
      WHERE title IS NOT NULL AND title != ''
      ORDER BY last_visit_time DESC
      LIMIT 50
    `;

    const { stdout } = await execAsync(`sqlite3 "${historyPath}" "${query}"`);
    const historyItems = stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    const history: SearchItem[] = [];

    // Parse SQLite output and create SearchItem objects with URL validation
    for (let index = 0; index < historyItems.length; index++) {
      const item = historyItems[index];
      // SQLite output uses | as separator by default
      const parts = item.split("|");
      const title = parts[0]?.trim() || "Untitled";
      let url = parts[1]?.trim() || "";
      const visitCount = parts[2]?.trim() || "0";

      // Ensure URL has proper protocol for browser compatibility
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
      }

      // Skip entries with invalid or empty URLs
      if (!url || url === "https://") {
        continue;
      }

      history.push({
        id: `history-${index}`,
        title,
        subtitle: url,
        url,
        type: "history",
        icon: Icon.Clock,
        accessory: `${visitCount} visits`,
      });
    }

    console.log("service::getBraveHistory::Debug::Retrieved history", {
      count: history.length,
      sampleUrls: history.slice(0, 3).map((h) => h.url),
    });

    // Cache the results
    cache.history = {
      data: history,
      timestamp: Date.now(),
    };

    return history;
  } catch (error) {
    console.log("service::getBraveHistory::Error::Failed to get history", {
      error: String(error),
    });
    return [];
  }
};

/**
 * Creates a search suggestion item for web search engines.
 *
 * Generates a SearchItem that represents a web search query using the user's
 * preferred search engine. Supports Google, DuckDuckGo, and Bing.
 *
 * @param query - The search query text
 * @param searchEngine - The preferred search engine identifier
 * @returns SearchItem representing the search suggestion
 */
export const createSearchSuggestion = (query: string, searchEngine: string): SearchItem => {
  const searchEngines = {
    google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  };

  const searchUrl = searchEngines[searchEngine as keyof typeof searchEngines] || searchEngines.google;

  return {
    id: `search-${query}`,
    title: `Search for "${query}"`,
    subtitle: `Search using ${searchEngine}`,
    url: searchUrl,
    type: "search",
    icon: Icon.MagnifyingGlass,
    accessory: "Web Search",
  };
};

/**
 * Filters search items based on a query string.
 *
 * Performs case-insensitive matching against item title, subtitle, and URL.
 * Returns all items if query is empty or whitespace-only.
 *
 * @param items - Array of SearchItem objects to filter
 * @param query - Search query string
 * @returns Filtered array of SearchItem objects
 */
export const filterItems = (items: SearchItem[], query: string): SearchItem[] => {
  if (!query.trim()) return items;

  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.subtitle.toLowerCase().includes(lowerQuery) ||
      item.url.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Loads and combines data from Brave Browser tabs and history.
 *
 * This is the main data loading function that orchestrates gathering tabs
 * and history data. It supports progressive loading where tabs are loaded
 * first and made available via callback, while history loads in parallel.
 *
 * @param onTabsLoaded - Optional callback called when tabs are ready
 * @returns Promise resolving to combined array of SearchItem objects
 */
export const loadBraveData = async (onTabsLoaded?: (tabs: SearchItem[]) => void): Promise<SearchItem[]> => {
  console.log("service::loadBraveData::Debug::Starting data load");

  // Start both operations in parallel
  const tabsPromise = getBraveTabs();
  const historyPromise = getBraveHistory();

  // Wait for tabs first and notify via callback if provided
  const tabs = await tabsPromise;
  console.log("service::loadBraveData::Debug::Tabs loaded", {
    count: tabs.length,
  });

  if (onTabsLoaded) {
    onTabsLoaded(tabs);
  }

  // Wait for history to complete
  const history = await historyPromise;
  console.log("service::loadBraveData::Debug::History loaded", {
    count: history.length,
  });

  const combinedItems = [...tabs, ...history];

  console.log("service::loadBraveData::Log::Data loaded successfully", {
    tabs: tabs.length,
    history: history.length,
    total: combinedItems.length,
  });

  return combinedItems;
};

/**
 * Focuses an existing tab in Brave Browser using AppleScript.
 *
 * This function attempts to switch to an existing tab using two approaches:
 * 1. Precise focusing using stored window and tab indices (preferred)
 * 2. URL-based lookup as fallback when indices are unavailable
 *
 * The precise approach uses the correct AppleScript syntax:
 * `set active tab index of window X to Y`
 *
 * @param item - SearchItem representing the tab to focus
 * @returns Boolean indicating whether the tab was successfully focused
 */
export const focusExistingTab = (item: SearchItem): boolean => {
  try {
    let applescriptCommand: string;

    if (
      typeof item.windowIndex === "number" &&
      !Number.isNaN(item.windowIndex) &&
      typeof item.tabIndex === "number" &&
      !Number.isNaN(item.tabIndex)
    ) {
      // Preferred: Use precise window and tab indices for reliable focusing
      applescriptCommand = `
        tell application "Brave Browser"
          try
            set active tab index of window ${item.windowIndex} to ${item.tabIndex}
            set index of window ${item.windowIndex} to 1
            activate
            return "success"
          on error errMsg
            return "error: " & errMsg
          end try
        end tell
      `;
    } else {
      // Fallback: Search for tab by URL when indices are unavailable
      const escapedUrl = item.url.replace(/"/g, '\\"');
      applescriptCommand = `
        tell application "Brave Browser"
          try
            set foundTab to false
            set foundWindow to 1
            set foundTabIndex to 1
            repeat with w in windows
              set tabIndex to 1
              repeat with t in tabs of w
                if URL of t is equal to "${escapedUrl}" then
                  set foundWindow to (get index of w)
                  set foundTabIndex to tabIndex
                  set foundTab to true
                  exit repeat
                end if
                set tabIndex to tabIndex + 1
              end repeat
              if foundTab then exit repeat
            end repeat
            if foundTab then
              set active tab index of window foundWindow to foundTabIndex
              set index of window foundWindow to 1
              activate
              return "success"
            else
              return "not found"
            end if
          on error errMsg
            return "error: " & errMsg
          end try
        end tell
      `;
    }

    const result = execSync(`osascript -e '${applescriptCommand}'`, {
      encoding: "utf8",
    });

    const resultText = result.trim();
    const success = resultText === "success";

    console.log("service::focusExistingTab::Debug::Tab focus result", {
      url: item.url,
      windowIndex: item.windowIndex,
      tabIndex: item.tabIndex,
      success,
    });

    return success;
  } catch (error) {
    console.log("service::focusExistingTab::Error::Failed to focus tab", {
      url: item.url,
      windowIndex: item.windowIndex,
      tabIndex: item.tabIndex,
      error: String(error),
    });
    return false;
  }
};
