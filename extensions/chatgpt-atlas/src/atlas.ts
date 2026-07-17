import { runAppleScript, showFailureToast, useCachedPromise, usePromise, useSQL } from "@raycast/utils";
import { resolve } from "path";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { readFile } from "fs/promises";

type LocalState = {
  profile: {
    last_used: string;
    info_cache: Record<string, { name: string; active_time?: number }>;
  };
};

type HistorySqlRow = {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
};

type Tab = {
  title: string;
  url: string;
  windowId: number;
  tabIndex: number;
  isActive: boolean;
};

type Bookmark = {
  id: string;
  name: string;
  url: string;
  dateAdded: string;
  folder?: string;
};

type BookmarkNode = {
  id?: string;
  name?: string;
  type?: string;
  url?: string;
  date_added?: string;
  children?: BookmarkNode[];
};

type BookmarksFile = {
  roots: {
    bookmark_bar: BookmarkNode;
    other: BookmarkNode;
    synced?: BookmarkNode;
  };
};

function getActiveProfilePath() {
  const localStatePath = resolve(
    homedir(),
    "Library/Application Support/com.openai.atlas/browser-data/host/Local State",
  );
  if (!existsSync(localStatePath)) throw new Error("Local State file not found");

  try {
    const fileContent = readFileSync(localStatePath, "utf-8");
    const localState: LocalState = JSON.parse(fileContent);

    // Get the last used profile
    const lastUsedProfile = localState.profile.last_used;

    return resolve(homedir(), `Library/Application Support/com.openai.atlas/browser-data/host/${lastUsedProfile}`);
  } catch (error) {
    console.error("Error reading Local State:", error);
    // Fallback to Default profile
    return resolve(homedir(), "Library/Application Support/com.openai.atlas/browser-data/host/Default");
  }
}

function getHistoryPath() {
  return resolve(getActiveProfilePath(), "History");
}

function getBookmarksPath() {
  return resolve(getActiveProfilePath(), "Bookmarks");
}

function getHistoryQuery(searchText?: string, limit = 200) {
  const whereClause = searchText
    ? searchText
        .split(" ")
        .filter((word) => word.length > 0)
        .map((term) => `(url LIKE "%${term}%" OR title LIKE "%${term}%")`)
        .join(" AND ")
    : undefined;

  return `
    SELECT id,
          url,
          title,
          datetime(last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') AS lastVisitedAt
    FROM urls
    ${whereClause ? `WHERE ${whereClause}` : ""}
    GROUP BY url
    ORDER BY last_visit_time DESC
    LIMIT ${limit};
  `;
}

export function useSearchHistory(searchText?: string, options: { limit?: number } = {}) {
  let historyPath = "";
  try {
    historyPath = getHistoryPath();
  } catch (error) {
    showFailureToast(error, { title: "Error reading history file" });
    return { isLoading: false, error: error as Error, data: [], permissionView: null };
  }

  const escapedSearchText = searchText?.replace(/"/g, '""') ?? "";
  const historyQuery = getHistoryQuery(escapedSearchText, options?.limit);

  return useSQL<HistorySqlRow>(historyPath, historyQuery, {
    permissionPriming: "This extension needs access to read your ChatGPT Atlas browser history.",
  });
}

async function getTabs() {
  const script = `
    set tabList to {}
    
    tell application "ChatGPT Atlas"
      repeat with w in every window
        set windowId to id of w
        set tabIndex to 0
        set activeIndex to active tab index of w
        try
          set winTabs to every tab of w
          
          repeat with t in winTabs
            set tabIndex to tabIndex + 1
            set tabTitle to title of t
            set tabURL to URL of t
            set isActive to (tabIndex = activeIndex)
            set end of tabList to {tabTitle, tabURL, windowId, tabIndex, isActive}
          end repeat
        end try
      end repeat
    end tell
    
    set output to ""
    repeat with tabInfo in tabList
      set output to output & item 1 of tabInfo & "|||" & item 2 of tabInfo & "|||" & item 3 of tabInfo & "|||" & item 4 of tabInfo & "|||" & item 5 of tabInfo & "\\n"
    end repeat
    
    return output
  `;

  const result = await runAppleScript(script);
  const tabs: Tab[] = [];
  const lines = result.trim().split("\n");

  for (const line of lines) {
    if (line) {
      const [title, url, windowId, tabIndex, isActive] = line.split("|||");
      tabs.push({
        title,
        url,
        windowId: parseInt(windowId),
        tabIndex: parseInt(tabIndex),
        isActive: isActive === "true",
      });
    }
  }

  return tabs;
}

export function useTabs() {
  return usePromise(getTabs);
}

export async function closeTab(windowIndex: number, tabIndex: number) {
  const script = `
    tell application "ChatGPT Atlas"
      tell window ${windowIndex}
        close tab ${tabIndex}
      end tell
    end tell
  `;
  await runAppleScript(script);
}

export async function reloadTab(windowIndex: number, tabIndex: number) {
  const script = `
    tell application "ChatGPT Atlas"
      tell window ${windowIndex}
        reload tab ${tabIndex}
      end tell
    end tell
  `;
  await runAppleScript(script);
}

export async function openNewTab(url: string) {
  const script = `
    tell application "ChatGPT Atlas"
      tell window 1
        make new tab with properties {URL:"${url}"}
      end tell
      activate
    end tell
  `;
  await runAppleScript(script);
}

export async function focusTab(windowId: number, tabIndex: number) {
  console.log("focusTab", windowId, tabIndex);
  const script = `
    tell application "ChatGPT Atlas"
      activate
      set _wnd to first window whose id is ${windowId}
      set index of _wnd to 1
      set active tab index of _wnd to ${tabIndex}
    end tell
    return true
  `;
  await runAppleScript(script);
}

function parseBookmarks(node: BookmarkNode, folder = "", bookmarks: Bookmark[] = []): Bookmark[] {
  if (node.type === "url" && node.url) {
    // Convert Chrome timestamp (microseconds since 1601) to readable date
    const timestamp = node.date_added ? parseInt(node.date_added) : 0;
    const dateAdded = timestamp ? new Date((timestamp / 1000000 - 11644473600) * 1000).toLocaleDateString() : "Unknown";

    bookmarks.push({
      id: node.id || "",
      name: node.name || "Untitled",
      url: node.url,
      dateAdded,
      folder: folder || undefined,
    });
  }

  if (node.children) {
    const currentFolder = node.name || folder;
    for (const child of node.children) {
      parseBookmarks(child, currentFolder, bookmarks);
    }
  }

  return bookmarks;
}

async function getBookmarks() {
  const bookmarksPath = getBookmarksPath();

  const fileContent = await readFile(bookmarksPath, "utf-8");
  const bookmarksData: BookmarksFile = JSON.parse(fileContent);

  const bookmarks: Bookmark[] = [];

  // Parse bookmark bar
  if (bookmarksData.roots.bookmark_bar) {
    parseBookmarks(bookmarksData.roots.bookmark_bar, "Bookmarks Bar", bookmarks);
  }

  // Parse other bookmarks
  if (bookmarksData.roots.other) {
    parseBookmarks(bookmarksData.roots.other, "Other Bookmarks", bookmarks);
  }

  // Parse synced bookmarks if they exist
  if (bookmarksData.roots.synced) {
    parseBookmarks(bookmarksData.roots.synced, "Synced Bookmarks", bookmarks);
  }

  return bookmarks;
}

export function useBookmarks() {
  return useCachedPromise(getBookmarks, [], {
    failureToastOptions: {
      title: "Failed to fetch bookmarks",
    },
  });
}
