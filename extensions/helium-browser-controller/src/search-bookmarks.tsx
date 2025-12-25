/**
 * Search Bookmarks - Helium Browser Controller
 * @author Just_Me
 */

import { List, showToast, Toast, Action, ActionPanel, Icon, showHUD, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);
// Absolute path to workspace debug log to avoid missing file issues at runtime
const DEBUG_LOG_PATH =
  "c:\\Users\\kkosi\\Documents\\My extension\\helium-raycast-extension\\helium-browser-controller\\.cursor\\debug.log";

function logDebug(payload: {
  sessionId: string;
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: unknown;
}) {
  try {
    const dir = path.dirname(DEBUG_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const line = JSON.stringify({
      ...payload,
      timestamp: Date.now(),
    });
    fs.appendFileSync(DEBUG_LOG_PATH, line + "\n");
  } catch {
    // ignore logging errors
  }
}

interface BookmarkItem {
  id: string;
  name: string;
  url?: string;
  type: "url" | "folder";
  dateAdded: number;
  dateAddedFormatted: Date;
  parentId?: string;
  path: string;
  displayPath: string;
  isFolder: boolean;
  children?: BookmarkItem[];
}

interface BookmarkNode {
  id?: string;
  name?: string;
  type?: "folder" | "url";
  url?: string;
  date_added?: number;
  children?: BookmarkNode[];
  [key: string]: unknown;
}

interface BookmarksFile {
  roots?: {
    bookmark_bar?: BookmarkNode;
    other?: BookmarkNode;
    synced?: BookmarkNode;
    [key: string]: BookmarkNode | undefined;
  };
  [key: string]: unknown;
}

interface BookmarkSearchResult {
  item: BookmarkNode;
  parent: BookmarkNode | null;
  parentIndex: number;
  path: string[];
}

// Get LocalAppData path using multiple methods
function getLocalAppDataPaths(): string[] {
  const paths: string[] = [];

  if (process.env.LOCALAPPDATA) {
    paths.push(process.env.LOCALAPPDATA);
  }

  if (process.env.USERPROFILE) {
    const candidate = path.join(process.env.USERPROFILE, "AppData", "Local");
    if (!paths.includes(candidate)) paths.push(candidate);
  }

  try {
    const homeDir = os.homedir();
    if (homeDir) {
      const candidate = path.join(homeDir, "AppData", "Local");
      if (!paths.includes(candidate)) paths.push(candidate);
    }
  } catch {
    // Ignore
  }

  return paths;
}

// Find Bookmarks file
function findBookmarksFile(): string | null {
  const localAppDataPaths = getLocalAppDataPaths();
  const possiblePaths: string[] = [];

  for (const localAppData of localAppDataPaths) {
    const possibleRoots = [
      path.join(localAppData, "imput", "Helium", "User Data"),
      path.join(localAppData, "Helium", "User Data"),
    ];

    for (const root of possibleRoots) {
      possiblePaths.push(path.join(root, "Default", "Bookmarks"));
      possiblePaths.push(path.join(root, "Profile 1", "Bookmarks"));
      possiblePaths.push(path.join(root, "Profile 2", "Bookmarks"));
    }
  }

  for (const bookmarkPath of possiblePaths) {
    if (fs.existsSync(bookmarkPath)) {
      return bookmarkPath;
    }
  }

  return null;
}

function getBookmarksFileCandidates(): string[] {
  const localAppDataPaths = getLocalAppDataPaths();
  const possiblePaths: string[] = [];

  for (const localAppData of localAppDataPaths) {
    const possibleRoots = [
      path.join(localAppData, "imput", "Helium", "User Data"),
      path.join(localAppData, "Helium", "User Data"),
    ];

    for (const root of possibleRoots) {
      possiblePaths.push(path.join(root, "Default", "Bookmarks"));
      possiblePaths.push(path.join(root, "Profile 1", "Bookmarks"));
      possiblePaths.push(path.join(root, "Profile 2", "Bookmarks"));
    }
  }
  return possiblePaths;
}

function convertChromiumTimestamp(timestamp: number): Date {
  // Chromium timestamps are in microseconds since Windows epoch (1601-01-01)
  // Convert to Unix timestamp: (timestamp / 1000000) - 11644473600
  const unixTimestamp = timestamp / 1000000 - 11644473600;
  return new Date(unixTimestamp * 1000);
}

function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = getDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Cache for loaded bookmarks
let cachedBookmarks: BookmarkItem[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60000; // Cache for 1 minute

function clearBookmarksCache() {
  cachedBookmarks = null;
  cacheTimestamp = 0;
}

// Recursively flatten bookmark structure
function flattenBookmarks(node: BookmarkNode, parentPath: string[] = [], rootName: string = ""): BookmarkItem[] {
  const items: BookmarkItem[] = [];
  const currentPath = [...parentPath];

  if (node.name) {
    // This is a folder or bookmark
    if (node.type === "folder") {
      // Add folder to path
      currentPath.push(node.name);
      const folderPath = currentPath.join(" > ");

      // Create folder item
      const folderItem: BookmarkItem = {
        id: node.id || `folder_${node.name}_${Date.now()}`,
        name: node.name,
        type: "folder",
        dateAdded: node.date_added || 0,
        dateAddedFormatted: node.date_added ? convertChromiumTimestamp(node.date_added) : new Date(0),
        path: folderPath,
        displayPath: folderPath,
        isFolder: true,
      };
      items.push(folderItem);

      // Process children
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          items.push(...flattenBookmarks(child, currentPath, rootName));
        }
      }
    } else if (node.type === "url") {
      // This is a bookmark
      const bookmarkPath = currentPath.length > 0 ? currentPath.join(" > ") : rootName;
      const bookmarkItem: BookmarkItem = {
        id: node.id || `bookmark_${node.url}_${Date.now()}`,
        name: node.name || node.url || "Untitled",
        url: node.url,
        type: "url",
        dateAdded: node.date_added || 0,
        dateAddedFormatted: node.date_added ? convertChromiumTimestamp(node.date_added) : new Date(0),
        path: bookmarkPath,
        displayPath: bookmarkPath || "Bookmarks Bar",
        isFolder: false,
      };
      items.push(bookmarkItem);
    }
  } else if (node.children && Array.isArray(node.children)) {
    // Root node or node without name
    for (const child of node.children) {
      items.push(...flattenBookmarks(child, currentPath, rootName));
    }
  }

  return items;
}

// Load bookmarks from JSON file
function loadBookmarksFromFile(): BookmarkItem[] {
  const bookmarksPath = findBookmarksFile();
  if (!bookmarksPath) {
    return [];
  }

  try {
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/5bb3eab4-8130-43e7-9cf3-89f1ff6f6f7a", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "search-bookmarks.tsx:loadBookmarksFromFile",
        message: "loadBookmarksFromFile start",
        data: { bookmarksPath, exists: fs.existsSync(bookmarksPath) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    logDebug({
      sessionId: "debug-session",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "search-bookmarks.tsx:loadBookmarksFromFile",
      message: "start",
      data: { bookmarksPath, exists: fs.existsSync(bookmarksPath) },
    });
    // Try to read the file directly first
    let bookmarksData: BookmarksFile;
    try {
      const content = fs.readFileSync(bookmarksPath, "utf-8");
      bookmarksData = JSON.parse(content) as BookmarksFile;
    } catch {
      // If file is locked, try copying it first
      const tempDir = process.env.TEMP || process.env.TMP || os.tmpdir();
      const tempBookmarksPath = path.join(tempDir, `helium_bookmarks_${Date.now()}.json`);

      try {
        fs.copyFileSync(bookmarksPath, tempBookmarksPath);
        const content = fs.readFileSync(tempBookmarksPath, "utf-8");
        bookmarksData = JSON.parse(content) as BookmarksFile;
        // Clean up temp file
        try {
          fs.unlinkSync(tempBookmarksPath);
        } catch {
          // Ignore cleanup errors
        }
      } catch {
        throw new Error("Could not read bookmarks file. Please close Helium browser and try again.");
      }
    }

    const items: BookmarkItem[] = [];

    // Process roots: bookmark_bar, other, synced
    if (bookmarksData.roots) {
      if (bookmarksData.roots.bookmark_bar) {
        items.push(...flattenBookmarks(bookmarksData.roots.bookmark_bar, [], "Bookmarks Bar"));
      }
      if (bookmarksData.roots.other) {
        items.push(...flattenBookmarks(bookmarksData.roots.other, [], "Other Bookmarks"));
      }
      if (bookmarksData.roots.synced) {
        items.push(...flattenBookmarks(bookmarksData.roots.synced, [], "Synced Bookmarks"));
      }
    }

    return items;
  } catch (error: unknown) {
    console.error("Error loading bookmarks:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load bookmarks: ${errorMsg}`);
  }
}

function loadBookmarks(searchQuery: string = ""): BookmarkItem[] {
  // Use cached bookmarks if available and fresh
  const now = Date.now();
  if (!cachedBookmarks || now - cacheTimestamp > CACHE_TTL_MS) {
    cachedBookmarks = loadBookmarksFromFile();
    cacheTimestamp = now;
  }

  // Filter in JavaScript
  if (!searchQuery.trim()) {
    return cachedBookmarks;
  }

  const query = searchQuery.toLowerCase();
  return cachedBookmarks.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      (item.url && item.url.toLowerCase().includes(query)) ||
      item.path.toLowerCase().includes(query),
  );
}

// Find bookmark or folder in the JSON structure and return parent with index
function findItemInStructure(
  structure: BookmarkNode,
  targetId: string,
  parent: BookmarkNode | null = null,
  parentPath: string[] = [],
): BookmarkSearchResult | null {
  if (!structure || typeof structure !== "object") {
    return null;
  }

  if (structure.id === targetId) {
    // Found the item, need to find its index in parent's children
    if (parent && parent.children && Array.isArray(parent.children)) {
      const index = parent.children.findIndex((child: BookmarkNode) => child.id === targetId);
      return { item: structure, parent, parentIndex: index, path: parentPath };
    }
    return { item: structure, parent: null, parentIndex: -1, path: parentPath };
  }

  if (structure.children && Array.isArray(structure.children)) {
    const currentPath = structure.name ? [...parentPath, structure.name] : parentPath;
    for (let i = 0; i < structure.children.length; i++) {
      const child = structure.children[i];
      const found = findItemInStructure(child, targetId, structure, currentPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

// Force browser to reload bookmarks by touching the file timestamp
async function triggerBookmarkReload(bookmarksPath: string): Promise<void> {
  try {
    // Method 1: Update the file's modification time to trigger a reload
    const now = new Date();
    fs.utimesSync(bookmarksPath, now, now);

    // Method 2: Send F5 to the browser window to trigger a refresh of any open bookmark manager
    // This uses PowerShell to send keystrokes to Helium/Chrome window
    try {
      await execAsync(
        `powershell -Command "$wshell = New-Object -ComObject wscript.shell; $proc = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1; if ($proc) { [void]$wshell.AppActivate($proc.Id); Start-Sleep -Milliseconds 100; $wshell.SendKeys('{F5}'); Start-Sleep -Milliseconds 100 }"`,
      );
    } catch {
      // Ignore - browser may not have bookmark manager open
    }
  } catch {
    // Ignore errors - this is a best-effort optimization
  }
}

// Delete a single item from bookmarks data structure (helper for batch delete)
function deleteItemFromData(bookmarksData: BookmarksFile, itemId: string): boolean {
  if (!bookmarksData.roots) return false;

  for (const rootKey of ["bookmark_bar", "other", "synced"]) {
    const root = bookmarksData.roots[rootKey];
    if (root && root.children && Array.isArray(root.children)) {
      // First check if item is a direct child of root
      const directIndex = root.children.findIndex((child: BookmarkNode) => child.id === itemId);
      if (directIndex >= 0) {
        root.children.splice(directIndex, 1);
        return true;
      }

      // Otherwise search in nested structure
      const found = findItemInStructure(root, itemId);
      if (found && found.parent && found.parentIndex >= 0) {
        if (found.parent.children && Array.isArray(found.parent.children)) {
          found.parent.children.splice(found.parentIndex, 1);
          return true;
        }
      }
    }
  }
  return false;
}

// Delete multiple bookmarks/folders in one operation (avoids file locking issues)
async function deleteMultipleBookmarkItems(itemIds: string[]): Promise<{ successCount: number; failCount: number }> {
  const bookmarksPath = findBookmarksFile();
  if (!bookmarksPath) {
    throw new Error("Bookmarks file not found");
  }

  const tempDir = process.env.TEMP || process.env.TMP || os.tmpdir();
  const tempBookmarksPath = path.join(tempDir, `helium_bookmarks_delete_${Date.now()}.json`);
  const cleanupTempFile = () => {
    try {
      if (fs.existsSync(tempBookmarksPath)) {
        fs.unlinkSync(tempBookmarksPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  };

  try {
    // Copy file
    try {
      fs.copyFileSync(bookmarksPath, tempBookmarksPath);
    } catch {
      throw new Error("Could not copy bookmarks file");
    }

    // Read and parse
    const content = fs.readFileSync(tempBookmarksPath, "utf-8");
    const bookmarksData: BookmarksFile = JSON.parse(content);

    // Delete all items from the structure
    let successCount = 0;
    let failCount = 0;
    for (const itemId of itemIds) {
      if (deleteItemFromData(bookmarksData, itemId)) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (successCount === 0) {
      throw new Error("No bookmarks found to delete");
    }

    // Write back to temp file
    fs.writeFileSync(tempBookmarksPath, JSON.stringify(bookmarksData, null, 2), "utf-8");

    // Replace original file (with retries)
    let replaced = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        fs.copyFileSync(tempBookmarksPath, bookmarksPath);
        replaced = true;
        break;
      } catch {
        // Continue to next attempt
      }
    }

    if (!replaced) {
      // #region agent log
      logDebug({
        sessionId: "debug-session",
        runId: "post-fix",
        hypothesisId: "H1-batch",
        location: "search-bookmarks.tsx:deleteMultipleBookmarkItems",
        message: "batch replace failed after retries",
        data: { attempts: 5, successCount, failCount },
      });
      // #endregion
      throw new Error("Could not replace bookmarks file. Please close Helium browser and try again.");
    }

    // Trigger browser to reload bookmarks (only once for all deletions)
    await triggerBookmarkReload(bookmarksPath);

    // #region agent log
    logDebug({
      sessionId: "debug-session",
      runId: "post-fix",
      hypothesisId: "H1-batch",
      location: "search-bookmarks.tsx:deleteMultipleBookmarkItems",
      message: "batch delete success",
      data: { successCount, failCount },
    });
    // #endregion

    return { successCount, failCount };
  } finally {
    cleanupTempFile();
  }
}

// Delete bookmark or folder from JSON structure
async function deleteBookmarkItem(itemId: string): Promise<boolean> {
  const bookmarksPath = findBookmarksFile();
  if (!bookmarksPath) {
    throw new Error("Bookmarks file not found");
  }

  // Try multiple strategies to handle file locking
  const strategies = [
    // Strategy 1: Copy, modify, replace
    async () => {
      const tempDir = process.env.TEMP || process.env.TMP || os.tmpdir();
      const tempBookmarksPath = path.join(tempDir, `helium_bookmarks_delete_${Date.now()}.json`);
      const cleanupTempFile = () => {
        try {
          if (fs.existsSync(tempBookmarksPath)) {
            fs.unlinkSync(tempBookmarksPath);
          }
        } catch {
          // Ignore cleanup errors
        }
      };

      try {
        // Copy file
        try {
          fs.copyFileSync(bookmarksPath, tempBookmarksPath);
        } catch {
          throw new Error("Could not copy bookmarks file");
        }

        // Read and parse
        const content = fs.readFileSync(tempBookmarksPath, "utf-8");
        const bookmarksData = JSON.parse(content);

        // Find and delete item
        let deleted = false;
        let deletedItemInfo: { name?: string; type?: string; rootKey?: string } = {};
        if (bookmarksData.roots) {
          for (const rootKey of ["bookmark_bar", "other", "synced"]) {
            const root = bookmarksData.roots[rootKey];
            if (root && root.children && Array.isArray(root.children)) {
              // First check if item is a direct child of root
              const directIndex = root.children.findIndex((child: BookmarkNode) => child.id === itemId);
              if (directIndex >= 0) {
                const item = root.children[directIndex];
                deletedItemInfo = { name: item.name, type: item.type, rootKey };
                root.children.splice(directIndex, 1);
                deleted = true;
                break;
              }

              // Otherwise search in nested structure
              const found = findItemInStructure(root, itemId);
              if (found && found.parent && found.parentIndex >= 0) {
                // Remove from parent's children array by index
                if (found.parent.children && Array.isArray(found.parent.children)) {
                  const item = found.parent.children[found.parentIndex];
                  deletedItemInfo = { name: item?.name, type: item?.type, rootKey };
                  found.parent.children.splice(found.parentIndex, 1);
                  deleted = true;
                  break;
                }
              }
            }
          }
        }

        // #region agent log
        logDebug({
          sessionId: "debug-session",
          runId: "post-fix-v2",
          hypothesisId: "H2-folder",
          location: "search-bookmarks.tsx:deleteBookmarkItem",
          message: "item deletion attempt",
          data: { itemId, deleted, deletedItemInfo },
        });
        // #endregion

        if (!deleted) {
          throw new Error("Bookmark not found in structure");
        }

        // Write back to temp file
        fs.writeFileSync(tempBookmarksPath, JSON.stringify(bookmarksData, null, 2), "utf-8");

        // Replace original file (with retries)
        let replaced = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
            } else {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
            fs.copyFileSync(tempBookmarksPath, bookmarksPath);
            replaced = true;
            break;
          } catch {
            // Continue to next attempt
          }
        }

        if (!replaced) {
          // #region agent log
          fetch("http://127.0.0.1:7243/ingest/5bb3eab4-8130-43e7-9cf3-89f1ff6f6f7a", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "pre-fix",
              hypothesisId: "H2",
              location: "search-bookmarks.tsx:deleteBookmarkItem",
              message: "replace failed after retries",
              data: { attempts: 5 },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          logDebug({
            sessionId: "debug-session",
            runId: "pre-fix",
            hypothesisId: "H2",
            location: "search-bookmarks.tsx:deleteBookmarkItem",
            message: "replace failed after retries",
            data: { attempts: 5 },
          });
          throw new Error("Could not replace bookmarks file. Please close Helium browser and try again.");
        }

        // #region agent log - verify file was actually modified
        try {
          const verifyContent = fs.readFileSync(bookmarksPath, "utf-8");
          const verifyData = JSON.parse(verifyContent);
          // Check if item still exists
          let stillExists = false;
          if (verifyData.roots) {
            for (const rootKey of ["bookmark_bar", "other", "synced"]) {
              const root = verifyData.roots[rootKey];
              if (root) {
                const found = findItemInStructure(root, itemId);
                if (found) {
                  stillExists = true;
                  break;
                }
                // Also check direct children
                if (root.children?.some((c: BookmarkNode) => c.id === itemId)) {
                  stillExists = true;
                  break;
                }
              }
            }
          }
          logDebug({
            sessionId: "debug-session",
            runId: "post-fix-v2",
            hypothesisId: "H1-overwrite",
            location: "search-bookmarks.tsx:deleteBookmarkItem",
            message: "post-write verification",
            data: { itemId, stillExists, fileSize: verifyContent.length },
          });
        } catch {
          // Ignore verification errors
        }
        // #endregion

        // Trigger browser to reload bookmarks
        await triggerBookmarkReload(bookmarksPath);

        // #region agent log
        logDebug({
          sessionId: "debug-session",
          runId: "post-fix-v2",
          hypothesisId: "H2",
          location: "search-bookmarks.tsx:deleteBookmarkItem",
          message: "delete strategy success",
          data: { replaced: true, itemId, deletedItemInfo },
        });
        // #endregion
        return true;
      } finally {
        cleanupTempFile();
      }
    },
  ];

  for (const strategy of strategies) {
    try {
      await strategy();
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("locked") || errorMsg.includes("Could not")) {
        continue; // Try next strategy
      }
      throw error;
    }
  }

  throw new Error("Could not delete bookmark. Please close Helium browser and try again.");
}

// Find Helium executable
async function findHeliumPath(): Promise<string | null> {
  const localAppDataPaths = getLocalAppDataPaths();
  const homeDir = os.homedir();

  const paths = [
    homeDir ? path.join(homeDir, "AppData", "Local", "imput", "Helium", "Application", "chrome.exe") : null,
  ].filter((p): p is string => p !== null);

  for (const localAppData of localAppDataPaths) {
    paths.push(
      path.join(localAppData, "imput", "Helium", "Application", "chrome.exe"),
      path.join(localAppData, "imput", "Helium", "Helium.exe"),
      path.join(localAppData, "Programs", "Helium", "Helium.exe"),
      path.join(localAppData, "Helium", "Helium.exe"),
    );
  }

  if (process.env.PROGRAMFILES) {
    paths.push(path.join(process.env.PROGRAMFILES, "Helium", "Helium.exe"));
  }
  if (process.env["PROGRAMFILES(X86)"]) {
    paths.push(path.join(process.env["PROGRAMFILES(X86)"], "Helium", "Helium.exe"));
  }

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

async function launchURL(url: string): Promise<boolean> {
  const heliumPath = await findHeliumPath();
  if (!heliumPath) {
    return false;
  }

  try {
    const escapedPath = heliumPath.replace(/'/g, "''").replace(/"/g, '\\"');
    const escapedUrl = url.replace(/'/g, "''").replace(/"/g, '\\"');

    await execAsync(
      `powershell -Command "Start-Process -FilePath '${escapedPath}' -ArgumentList '${escapedUrl}' -ErrorAction Stop"`,
    );
    return true;
  } catch {
    try {
      await execAsync(`cmd /c start "" "${heliumPath}" "${url}"`);
      return true;
    } catch {
      return false;
    }
  }
}

export default function Command() {
  const [bookmarkItems, setBookmarkItems] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);
      const items = loadBookmarks(searchText);
      setBookmarkItems(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bookmarks");
      setBookmarkItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchText]);

  const handleOpenURL = async (url: string) => {
    const success = await launchURL(url);
    if (success) {
      await showHUD("Opening URL...");
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open URL",
        message: "Could not launch Helium browser",
      });
    }
  };

  const toggleSelection = useCallback((itemId: string) => {
    setSelectedItems((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteItem = async (item: BookmarkItem) => {
    const itemType = item.isFolder ? "folder" : "bookmark";
    const confirmed = await confirmAlert({
      title: `Delete ${itemType === "folder" ? "Folder" : "Bookmark"}`,
      message: `Are you sure you want to delete "${item.name}"${item.isFolder ? " and all its contents" : ""}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteBookmarkItem(item.id);
      await showToast({
        style: Toast.Style.Success,
        title: `${itemType === "folder" ? "Folder" : "Bookmark"} deleted`,
        message: "Close and reopen browser to see changes",
      });

      // Clear cache and reload
      clearBookmarksCache();
      cacheTimestamp = 0;

      try {
        setIsLoading(true);
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const items = loadBookmarks(searchText);
        setBookmarkItems(items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to reload bookmarks");
        setBookmarkItems([]);
      } finally {
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Failed to delete item";
      console.error("Delete error:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message: errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg,
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No items selected",
        message: "Please select items to delete",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Selected Items",
      message: `Are you sure you want to delete ${selectedItems.size} item${selectedItems.size === 1 ? "" : "s"}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);

      // Use batch delete to handle all items in one file operation
      const itemIds = Array.from(selectedItems);
      const { successCount, failCount } = await deleteMultipleBookmarkItems(itemIds);

      // Clear selection
      setSelectedItems(new Set());
      setIsSelectionMode(false);

      // Clear cache and reload
      clearBookmarksCache();
      cacheTimestamp = 0;

      if (successCount > 0) {
        const failMessage = failCount > 0 ? ` (${failCount} not found)` : "";
        await showToast({
          style: failCount > 0 ? Toast.Style.Animated : Toast.Style.Success,
          title: "Items deleted",
          message: `Deleted ${successCount} item${successCount === 1 ? "" : "s"}${failMessage}. Close and reopen browser to see changes`,
        });
      }
      // #region agent log
      logDebug({
        sessionId: "debug-session",
        runId: "post-fix",
        hypothesisId: "H1-batch",
        location: "search-bookmarks.tsx:handleBulkDelete",
        message: "bulk delete summary",
        data: { successCount, failCount },
      });
      // #endregion

      try {
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const items = loadBookmarks(searchText);
        setBookmarkItems(items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to reload bookmarks");
        setBookmarkItems([]);
      } finally {
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Failed to delete items";
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message: errorMsg,
      });
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Error Loading Bookmarks" description={error} />
      </List>
    );
  }

  const bookmarksPath = findBookmarksFile();
  if (!bookmarksPath && !isLoading) {
    const candidates = getBookmarksFileCandidates();
    const localPaths = getLocalAppDataPaths();
    const debugInfo = [
      `LocalAppData paths found: ${localPaths.length}`,
      localPaths.length > 0 ? localPaths[0] : "(none)",
      "",
      "Tried bookmark paths:",
      ...candidates.slice(0, 3),
    ].join("\n");
    return (
      <List>
        <List.EmptyView icon={Icon.Binoculars} title="Bookmarks File Not Found" description={debugInfo} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={isSelectionMode ? `Select items (${selectedItems.size} selected)` : "Search bookmarks..."}
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={!isSelectionMode}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Selection Mode"
          value={isSelectionMode ? "selection" : "normal"}
          onChange={(value) => {
            setIsSelectionMode(value === "selection");
            if (value !== "selection") {
              setSelectedItems(new Set());
            }
          }}
        >
          <List.Dropdown.Item title="Normal Mode" value="normal" />
          <List.Dropdown.Item title="Selection Mode" value="selection" />
        </List.Dropdown>
      }
    >
      {bookmarkItems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No Bookmarks Found"
          description={searchText ? "Try a different search term" : "No bookmarks available"}
        />
      ) : (
        bookmarkItems.map((item) => {
          const favicon = item.url ? getFaviconUrl(item.url) : "";
          const isSelected = selectedItems.has(item.id);

          return (
            <List.Item
              key={item.id}
              title={isSelectionMode && isSelected ? `✓ ${item.name}` : item.name}
              icon={item.isFolder ? Icon.Folder : { source: favicon || Icon.Globe, fallback: Icon.Globe }}
              accessories={[
                { text: item.displayPath || "Bookmarks Bar" },
                ...(isSelectionMode && isSelected ? [{ icon: Icon.Checkmark, tooltip: "Selected" }] : []),
              ]}
              detail={
                <List.Item.Detail
                  markdown={`## ${item.name}\n\n${item.url ? `**URL:** ${item.url}` : "**Type:** Folder"}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      {item.url && (
                        <List.Item.Detail.Metadata.Link
                          title="URL"
                          target={item.url}
                          text={item.url.length > 50 ? item.url.substring(0, 50) + "..." : item.url}
                        />
                      )}
                      <List.Item.Detail.Metadata.Label
                        title="Location"
                        text={item.displayPath || "Bookmarks Bar"}
                        icon={Icon.Folder}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Type"
                        text={item.isFolder ? "Folder" : "Bookmark"}
                        icon={item.isFolder ? Icon.Folder : Icon.Bookmark}
                      />
                      {item.dateAdded > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Date Added"
                          text={formatDate(item.dateAddedFormatted)}
                          icon={Icon.Calendar}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {isSelectionMode ? (
                    <>
                      <Action
                        title={isSelected ? "Deselect" : "Select"}
                        icon={isSelected ? Icon.Circle : Icon.Checkmark}
                        onAction={() => {
                          toggleSelection(item.id);
                        }}
                        shortcut={{ modifiers: ["ctrl"], key: "s" }}
                      />
                      {selectedItems.size > 0 && (
                        <Action
                          title={`Delete ${selectedItems.size} Selected`}
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={handleBulkDelete}
                          shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
                        />
                      )}
                      <Action
                        title="Exit Selection Mode"
                        icon={Icon.XMarkCircle}
                        onAction={() => {
                          setIsSelectionMode(false);
                          setSelectedItems(new Set());
                        }}
                        shortcut={{ modifiers: [], key: "escape" }}
                      />
                    </>
                  ) : (
                    <>
                      {item.url && (
                        <Action title="Open in Helium" icon={Icon.Globe} onAction={() => handleOpenURL(item.url!)} />
                      )}
                      <Action
                        title={`Delete ${item.isFolder ? "Folder" : "Bookmark"}`}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDeleteItem(item)}
                        shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
                      />
                      <Action
                        title="Select Multiple"
                        icon={Icon.Checkmark}
                        onAction={() => {
                          setIsSelectionMode(true);
                          toggleSelection(item.id);
                        }}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "s" }}
                      />
                      {item.url && (
                        <>
                          <Action.CopyToClipboard
                            title="Copy URL"
                            content={item.url}
                            shortcut={{ modifiers: ["ctrl"], key: "c" }}
                          />
                          <Action.CopyToClipboard
                            title="Copy Title"
                            content={item.name}
                            shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
                          />
                          <Action.OpenInBrowser title="Open in Default Browser" url={item.url} />
                        </>
                      )}
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
