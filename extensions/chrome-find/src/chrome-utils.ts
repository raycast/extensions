import { readFileSync, existsSync, copyFileSync, unlinkSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { execSync } from "child_process";

// ─── Types ───────────────────────────────────────────────────
export interface SearchResult {
  id: string;
  title: string;
  url: string;
  source: "tab" | "bookmark" | "history";
  subtitle?: string;
  favicon?: string;
  windowIndex?: number;
  tabIndex?: number;
  visitCount?: number;
  lastVisitTime?: number;
  content?: string;
}

export interface TabContent {
  windowIndex: number;
  tabIndex: number;
  content: string;
}

export interface LocalState {
  profile?: {
    last_active_profiles?: string[];
    info_cache?: Record<string, { active_time?: number }>;
  };
}

export interface ChromeBookmarkNode {
  type?: string;
  name?: string;
  url?: string;
  children?: ChromeBookmarkNode[];
  [key: string]: unknown;
}

// ─── Filesystem Dependencies (for testing) ───────────────────
export interface FsDeps {
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  copyFileSync: typeof copyFileSync;
  unlinkSync: typeof unlinkSync;
  execSync: typeof execSync;
  tmpdir: typeof tmpdir;
}

export const defaultFsDeps: FsDeps = {
  existsSync,
  readFileSync,
  copyFileSync,
  unlinkSync,
  execSync,
  tmpdir,
};

// ─── Chrome Base Path ────────────────────────────────────────
export function getChromeBasePath(): string {
  return join(homedir(), "Library", "Application Support", "Google", "Chrome");
}

// ─── Profile Detection ───────────────────────────────────────
export function detectActiveProfile(
  chromePath: string = getChromeBasePath(),
  deps: Pick<FsDeps, "existsSync" | "readFileSync"> = defaultFsDeps,
): string {
  const localStatePath = join(chromePath, "Local State");

  try {
    if (!deps.existsSync(localStatePath)) {
      return "Default";
    }

    const localState: LocalState = JSON.parse(
      deps.readFileSync(localStatePath, "utf-8") as string,
    );

    // Primary: Read last_active_profiles[0]
    if (localState.profile?.last_active_profiles?.length) {
      const lastActive = localState.profile.last_active_profiles[0];
      const profilePath = join(chromePath, lastActive);
      if (deps.existsSync(profilePath)) {
        return lastActive;
      }
    }

    // Fallback: Scan info_cache for most recent active_time
    if (localState.profile?.info_cache) {
      const profiles = Object.entries(localState.profile.info_cache);
      if (profiles.length > 0) {
        const sorted = profiles.sort((a, b) => {
          const timeA = a[1].active_time ?? 0;
          const timeB = b[1].active_time ?? 0;
          return timeB - timeA;
        });
        const mostRecent = sorted[0][0];
        const profilePath = join(chromePath, mostRecent);
        if (deps.existsSync(profilePath)) {
          return mostRecent;
        }
      }
    }
  } catch (error) {
    console.error("Error detecting Chrome profile:", error);
  }

  // Ultimate fallback
  return "Default";
}

// ─── Chrome Profile Path ─────────────────────────────────────
export function getChromeProfilePath(
  chromePath: string = getChromeBasePath(),
  deps: Pick<FsDeps, "existsSync" | "readFileSync"> = defaultFsDeps,
): string {
  const profile = detectActiveProfile(chromePath, deps);
  return join(chromePath, profile);
}

// ─── Favicon Helper ──────────────────────────────────────────
export function getFaviconUrl(pageUrl: string): string {
  try {
    const parsed = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?sz=64&domain=${parsed.hostname}`;
  } catch {
    return "";
  }
}

// ─── URL Normalization ───────────────────────────────────────
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(
      /\/+$/,
      "",
    );
  } catch {
    return url;
  }
}

// ─── Deduplication ───────────────────────────────────────────
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();
  const priority = { tab: 0, bookmark: 1, history: 2 };

  for (const result of results) {
    const normalizedUrl = normalizeUrl(result.url);
    const existing = seen.get(normalizedUrl);
    if (!existing || priority[result.source] < priority[existing.source]) {
      seen.set(normalizedUrl, result);
    }
  }

  return Array.from(seen.values());
}

// ─── Bookmark Parsing ────────────────────────────────────────
export function extractBookmarks(
  node: ChromeBookmarkNode,
  results: SearchResult[],
  path = "",
): void {
  if (node.type === "url" && node.url && node.name) {
    results.push({
      id: `bookmark-${results.length}`,
      title: node.name,
      url: node.url,
      source: "bookmark",
      subtitle: path ? `${path} › ${node.url}` : node.url,
      favicon: getFaviconUrl(node.url),
    });
  }

  if (node.children) {
    const folderName = path ? `${path} › ${node.name || ""}` : node.name || "";
    for (const child of node.children) {
      extractBookmarks(child, results, folderName);
    }
  }

  // Handle roots structure
  for (const key of ["bookmark_bar", "other", "synced"]) {
    if (key in node && typeof node[key] === "object" && node[key] !== null) {
      extractBookmarks(node[key] as ChromeBookmarkNode, results, path);
    }
  }
}

// ─── Get Chrome Bookmarks ────────────────────────────────────
export function getChromeBookmarks(
  profilePath?: string,
  deps: Pick<FsDeps, "existsSync" | "readFileSync"> = defaultFsDeps,
): SearchResult[] {
  const resolvedPath = profilePath ?? getChromeProfilePath();
  try {
    const bookmarksPath = join(resolvedPath, "Bookmarks");
    if (!deps.existsSync(bookmarksPath)) return [];

    const data = JSON.parse(
      deps.readFileSync(bookmarksPath, "utf-8") as string,
    );
    const results: SearchResult[] = [];
    if (data.roots) {
      extractBookmarks({ ...data.roots } as ChromeBookmarkNode, results);
    }
    return results;
  } catch (error) {
    console.error("Error reading bookmarks:", error);
    return [];
  }
}

// ─── Parse History Output ────────────────────────────────────
export function parseHistoryOutput(output: string): SearchResult[] {
  if (!output || output.trim() === "") return [];

  return output
    .split("\n")
    .filter((line: string) => line.trim())
    .map((line: string, index: number) => {
      const parts = line.split("|||");
      return {
        id: `history-${index}`,
        title: parts[1] || parts[0] || "Untitled",
        url: parts[0] || "",
        source: "history" as const,
        subtitle: parts[0] || "",
        favicon: getFaviconUrl(parts[0] || ""),
        visitCount: parseInt(parts[2]) || 0,
      };
    });
}

// ─── Get Chrome History ──────────────────────────────────────
export function getChromeHistory(
  limit = 500,
  profilePath?: string,
  deps: FsDeps = defaultFsDeps,
): SearchResult[] {
  const resolvedPath = profilePath ?? getChromeProfilePath();
  try {
    const historyPath = join(resolvedPath, "History");
    if (!deps.existsSync(historyPath)) return [];

    const tempPath = join(
      deps.tmpdir(),
      `chrome-history-raycast-${Date.now()}.db`,
    );

    try {
      deps.copyFileSync(historyPath, tempPath);
    } catch {
      console.error("Could not copy History database");
      return [];
    }

    let results: SearchResult[] = [];

    try {
      const output = deps.execSync(
        `sqlite3 -separator '|||' "${tempPath}" "SELECT url, title, visit_count FROM urls ORDER BY last_visit_time DESC LIMIT ${limit};"`,
        { encoding: "utf-8", timeout: 5000 },
      ) as string;

      results = parseHistoryOutput(output);
    } catch (error) {
      console.error("Error querying history database:", error);
    }

    try {
      deps.unlinkSync(tempPath);
    } catch {
      // ignore cleanup errors
    }

    return results;
  } catch (error) {
    console.error("Error reading history:", error);
    return [];
  }
}

// ─── Parse Tab Output ────────────────────────────────────────
export function parseTabOutput(output: string): SearchResult[] {
  if (!output || output.trim() === "") return [];

  const tabs: SearchResult[] = [];
  const lines = output.split("\n").filter((line) => line.trim() !== "");

  for (const line of lines) {
    const parts = line.split("|||");
    if (parts.length >= 4) {
      const windowIndex = parseInt(parts[0]);
      const tabIndex = parseInt(parts[1]);
      const title = parts[2] || "Untitled";
      const url = parts[3] || "";

      tabs.push({
        id: `tab-${windowIndex}-${tabIndex}`,
        title,
        url,
        source: "tab",
        subtitle: url,
        favicon: getFaviconUrl(url),
        windowIndex,
        tabIndex,
      });
    }
  }

  return tabs;
}

// ─── Source Helpers ──────────────────────────────────────────
export type SourceType = "tab" | "bookmark" | "history";

export function getSourceTagInfo(source: SourceType): {
  value: string;
  colorName: string;
} {
  switch (source) {
    case "tab":
      return { value: "Tab", colorName: "Green" };
    case "bookmark":
      return { value: "Bookmark", colorName: "Blue" };
    case "history":
      return { value: "History", colorName: "Orange" };
  }
}

export function getSourceIconName(source: SourceType): string {
  switch (source) {
    case "tab":
      return "Globe";
    case "bookmark":
      return "Bookmark";
    case "history":
      return "Clock";
  }
}

// ─── Extract Domain ──────────────────────────────────────────
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ─── Tab Content Parsing ─────────────────────────────────────
/**
 * Parse the output from AppleScript content fetching.
 * Format: windowIndex|||tabIndex|||content
 */
export function parseTabContentOutput(output: string): TabContent[] {
  if (!output || output.trim() === "") return [];

  const contents: TabContent[] = [];
  const lines = output.split("\n").filter((line) => line.trim() !== "");

  for (const line of lines) {
    const parts = line.split("|||");
    if (parts.length >= 3) {
      const windowIndex = parseInt(parts[0]);
      const tabIndex = parseInt(parts[1]);
      const content = parts.slice(2).join("|||"); // Content might contain |||

      if (!isNaN(windowIndex) && !isNaN(tabIndex) && content) {
        contents.push({
          windowIndex,
          tabIndex,
          content,
        });
      }
    }
  }

  return contents;
}

// ─── Merge Content into Results ──────────────────────────────
/**
 * Merge tab content into existing search results.
 * Matches by windowIndex and tabIndex.
 */
export function mergeContentIntoResults(
  results: SearchResult[],
  contents: TabContent[],
): SearchResult[] {
  // Create a map for quick lookup
  const contentMap = new Map<string, string>();
  for (const item of contents) {
    const key = `${item.windowIndex}-${item.tabIndex}`;
    contentMap.set(key, item.content);
  }

  return results.map((result) => {
    if (
      result.source === "tab" &&
      result.windowIndex !== undefined &&
      result.tabIndex !== undefined
    ) {
      const key = `${result.windowIndex}-${result.tabIndex}`;
      const content = contentMap.get(key);
      if (content) {
        return { ...result, content };
      }
    }
    return result;
  });
}
