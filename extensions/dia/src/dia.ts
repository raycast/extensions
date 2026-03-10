import { runAppleScript, showFailureToast, useCachedPromise, usePromise, useSQL } from "@raycast/utils";
import { resolve } from "path";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { escapeAppleScriptString, escapeSQLLikePattern } from "./utils";
import { getBookmarksTree, type BookmarkDirectory } from "./bookmarks";

type LocalState = {
  profile: {
    last_used: string;
    info_cache: Record<string, { name: string; active_time?: number }>;
  };
};

export type HistoryItem = {
  id: number;
  url: string;
  title?: string;
  lastVisitedAt: string;
};

export type Tab = {
  windowId: string;
  tabId: string;
  title: string;
  url?: string;
  isPinned: boolean;
  isFocused: boolean;
};

export type Bookmark = {
  id: string;
  name: string;
  url: string;
  path: string; // Breadcrumb as single string (e.g., "Bookmarks Bar › Work")
};

function getActiveProfilePath() {
  const localStatePath = resolve(homedir(), "Library/Application Support/Dia/User Data/Local State");

  try {
    const fileContent = readFileSync(localStatePath, "utf-8");
    const localState: LocalState = JSON.parse(fileContent);

    // Get the last used profile
    const lastUsedProfile = localState.profile.last_used || "Default";

    return resolve(homedir(), `Library/Application Support/Dia/User Data/${lastUsedProfile}`);
  } catch (error) {
    console.error("Error reading Local State:", error);
    // Fallback to Default profile
    return resolve(homedir(), "Library/Application Support/Dia/User Data/Default");
  }
}

function getHistoryPath() {
  return resolve(getActiveProfilePath(), "History");
}

export function getBookmarksPath() {
  return resolve(getActiveProfilePath(), "Bookmarks");
}

async function searchBookmarks(searchText: string): Promise<Bookmark[]> {
  if (!searchText || searchText.trim().length === 0) {
    return [];
  }

  try {
    const tree = await getBookmarksTree();
    const results: Bookmark[] = [];
    const query = searchText.toLowerCase();

    // Recursively search bookmarks with simple case-insensitive matching
    function searchInDirectory(dir: BookmarkDirectory, currentPath: string[] = []) {
      if (!dir.children) return;

      for (const child of dir.children) {
        if (child.type === "url" && child.url) {
          const searchableText = `${child.name.toLowerCase()} ${child.url.toLowerCase()}`;

          // Simple case-insensitive search (matching filterTabs pattern)
          if (searchableText.includes(query)) {
            results.push({
              id: child.id,
              name: child.name,
              url: child.url,
              path: currentPath.length > 0 ? currentPath.join(" › ") : "Bookmarks",
            });
          }
        } else if (child.type === "folder") {
          searchInDirectory(child, [...currentPath, child.name]);
        }
      }
    }

    // Start search from the root (which already has friendly names from getBookmarksTree)
    searchInDirectory(tree);

    return results;
  } catch (error) {
    console.error("Error searching bookmarks:", error);
    return [];
  }
}

function getHistoryQuery(searchText?: string, limit = 100) {
  // Skip filtered query for single-char searches (too broad, wastes I/O)
  const effectiveSearch = searchText && searchText.trim().length >= 2 ? searchText : undefined;
  const whereClause = effectiveSearch
    ? effectiveSearch
        .split(" ")
        .filter((word) => word.length > 0)
        .map((term) => {
          const escapedTerm = escapeSQLLikePattern(term);
          return `(url LIKE "%${escapedTerm}%" ESCAPE '\\' OR title LIKE "%${escapedTerm}%" ESCAPE '\\')`;
        })
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
  const historyPath = getHistoryPath();
  // getHistoryQuery now handles escaping internally
  const historyQuery = getHistoryQuery(searchText, options?.limit);

  const dbExists = existsSync(historyPath);
  // const result = useSQL<HistoryItem>(dbExists ? historyPath : __filename, historyQuery, {
  const result = useSQL<HistoryItem>(dbExists ? historyPath : __filename, historyQuery, {
    permissionPriming: "This extension needs access to read your Dia browser history.",
    execute: dbExists,
  });

  if (!dbExists) {
    const error = new Error("The database does not exist");
    showFailureToast(error);
    return { isLoading: false, error, data: [], permissionView: null, revalidate: () => {} };
  }
  return result;
}

/** Escapes unescaped " inside JSON string values so JSON.parse succeeds (AppleScript may miss some). */
function fixUnescapedQuotesInJson(jsonStr: string): string {
  let inString = false;
  let inKey = false; // true when the current string is a key (e.g. "title"), false when a value
  let escaped = false;
  let lastStructural = "{"; // so first " is treated as key
  let result = "";
  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i];
    if (escaped) {
      result += c;
      escaped = false;
      continue;
    }
    if (c === "\\") {
      result += c;
      escaped = true;
      continue;
    }
    if (!inString && (c === "{" || c === "," || c === ":" || c === "}" || c === "]")) {
      lastStructural = c;
    }
    if (c === '"') {
      if (inString) {
        let j = i + 1;
        while (j < jsonStr.length && jsonStr[j] === " ") j++;
        const next = jsonStr[j];
        const keyClose = inKey && next === ":";
        const valueClose = !inKey && (next === "," || next === "}" || next === "]" || j >= jsonStr.length);
        if (keyClose || valueClose) {
          result += c;
          inString = false;
        } else {
          result += "\\" + c;
        }
      } else {
        result += c;
        inString = true;
        inKey = lastStructural === "{" || lastStructural === ",";
      }
      continue;
    }
    result += c;
  }
  return result;
}

async function getTabs(): Promise<Tab[]> {
  // JXA (JavaScript for Automation) is significantly faster than AppleScript
  // for complex data extraction: native JSON, no O(n^2) string concat.
  // If JXA fails (e.g. Dia doesn't expose JXA dictionary), fall back to
  // bulk AppleScript using `properties of every tab` (still 10-14x faster
  // than the original per-tab property access).
  try {
    const { tabs: jxaResult, windowCount } = await getTabsJXA();
    // When JXA returns 0 tabs but Dia has windows (JXA bug in some versions), try AppleScript
    if (jxaResult.length === 0 && windowCount > 0) {
      try {
        const asResult = await getTabsBulkAppleScript();
        if (asResult.length > 0) return asResult;
      } catch {
        // ignore, return []
      }
    }
    return jxaResult;
  } catch {
    try {
      return await getTabsBulkAppleScript();
    } catch {
      return [];
    }
  }
}

async function getTabsJXA(): Promise<{ tabs: Tab[]; windowCount: number }> {
  const jxa = `
    (() => {
      const dia = Application("Dia");
      const wins = dia.windows();
      const tabs = [];
      for (let i = 0; i < wins.length; i++) {
        const w = wins[i];
        try {
          const wId = String(w.id());
          const wTabs = w.tabs();
          for (let j = 0; j < wTabs.length; j++) {
            const t = wTabs[j];
            let url = "";
            try { url = t.url() || ""; } catch(e) {}
            tabs.push({
              windowId: wId,
              tabId: String(t.id()),
              title: t.name() || t.title() || "",
              url: url,
              isPinned: !!t.isPinned(),
              isFocused: !!t.isFocused(),
            });
          }
        } catch(e) {}
      }
      return JSON.stringify({ tabs: tabs, windowCount: wins.length });
    })()
  `;

  const result = execSync(`osascript -l JavaScript -e '${jxa.replace(/'/g, "'\\''")}'`, {
    timeout: 5000,
    encoding: "utf-8",
  }).trim();

  const parsed = JSON.parse(result) as {
    tabs: Array<{
      windowId: string;
      tabId: string;
      title: string;
      url: string;
      isPinned: boolean;
      isFocused: boolean;
    }>;
    windowCount: number;
  };

  return {
    tabs: parsed.tabs.map((t) => ({
      ...t,
      url: t.url || undefined,
    })),
    windowCount: parsed.windowCount,
  };
}

async function getTabsBulkAppleScript(): Promise<Tab[]> {
  // Bulk fetch using `properties of every tab` — one IPC call per window
  // instead of N calls per tab. 10-14x faster than nested repeat loops.
  const result = await runAppleScript(
    `
      on escape_value(this_text)
        if this_text is missing value then return ""
        set this_text to this_text as text
        set AppleScript's text item delimiters to "\\\\"
        set the item_list to every text item of this_text
        set AppleScript's text item delimiters to "\\\\\\\\"
        set this_text to the item_list as string
        set AppleScript's text item delimiters to "\\""
        set the item_list to every text item of this_text
        set AppleScript's text item delimiters to "\\\\\\""
        set this_text to the item_list as string
        set AppleScript's text item delimiters to ""
        return this_text
      end escape_value

      set _output to ""

      tell application "Dia"
        repeat with w in every window
          try
            set wId to id of w
            set allTabs to properties of every tab of w
            set tabsCount to count of allTabs
            repeat with i from 1 to tabsCount
              try
                set _tab to item i of allTabs
                set _title to ""
                try
                  set _title to my escape_value(get title of _tab)
                end try
                if _title is "" then
                  try
                    set _title to my escape_value(get name of _tab)
                  end try
                end if
                set _url to ""
                try
                  set _url to my escape_value(get URL of _tab)
                end try
                set _id to get id of _tab
                set _isPinned to get isPinned of _tab
                set _isFocused to get isFocused of _tab

                if _output is not "" then
                  set _output to (_output & ",")
                end if
                set _output to (_output & "{\\"windowId\\": \\"" & wId & "\\", \\"tabId\\": \\"" & _id & "\\", \\"title\\": \\"" & _title & "\\", \\"url\\": \\"" & _url & "\\", \\"isPinned\\": " & _isPinned & ", \\"isFocused\\": " & _isFocused & "}")
              on error
                (* skip this tab, avoid dangling comma *)
              end try
            end repeat
          on error errMsg number errNum
            (* swallow error for this window so we still return tabs from other windows *)
          end try
        end repeat
      end tell

      return "[" & _output & "]"
    `,
  );

  if (!result || result.trim() === "[]") return [];

  // AppleScript escape_value only escapes \ and "; control chars in title/URL break JSON. Normalize them.
  let sanitized = result
    .split("")
    .map((c) => (c.charCodeAt(0) <= 31 ? " " : c))
    .join("");
  // Escape unescaped " inside string values (e.g. titles with literal ") so JSON.parse succeeds.
  sanitized = fixUnescapedQuotesInJson(sanitized);

  const parsed = JSON.parse(sanitized) as Array<{
    windowId: string;
    tabId: string;
    title: string;
    url: string;
    isPinned: boolean;
    isFocused: boolean;
  }>;

  return parsed.map((t) => ({
    ...t,
    url: t.url || undefined,
  }));
}

export function useTabs() {
  return useCachedPromise(getTabs);
}

export function useBookmarks(searchText?: string) {
  return usePromise(async (query: string) => searchBookmarks(query), [searchText || ""], {
    execute: !!searchText && searchText.trim().length > 0,
  });
}

export async function focusTab(tab: Tab) {
  try {
    // JXA: direct window/tab lookup by ID (no nested loops)
    const jxa = `
      (() => {
        const dia = Application("Dia");
        dia.activate();
        const wins = dia.windows();
        for (let i = 0; i < wins.length; i++) {
          if (String(wins[i].id()) === '${tab.windowId.replace(/'/g, "\\'")}') {
            const tabs = wins[i].tabs();
            for (let j = 0; j < tabs.length; j++) {
              if (String(tabs[j].id()) === '${tab.tabId.replace(/'/g, "\\'")}') {
                tabs[j].focus();
                return "ok";
              }
            }
          }
        }
        return "not_found";
      })()
    `;
    execSync(`osascript -l JavaScript -e '${jxa.replace(/'/g, "'\\''")}'`, {
      timeout: 3000,
      encoding: "utf-8",
    });
  } catch {
    // Fallback to AppleScript
    const escapedWindowId = escapeAppleScriptString(tab.windowId);
    const escapedTabId = escapeAppleScriptString(tab.tabId);

    await runAppleScript(
      `tell application "Dia"
        activate
        repeat with w in every window
          if id of w is "${escapedWindowId}" then
            repeat with t in every tab of w
              if id of t is "${escapedTabId}" then
                focus t
                exit repeat
              end if
            end repeat
            exit repeat
          end if
        end repeat
      end tell`,
    );
  }
}

export async function createNewWindow(profile?: string) {
  if (profile) {
    // Escape user input to prevent AppleScript injection
    const escapedProfile = escapeAppleScriptString(profile);

    await runAppleScript(
      `
        tell application "Dia"
          activate
          tell application "System Events"
            tell process "Dia"
              tell menu bar item "File" of menu bar 1
                click
                tell menu item "New Window" of menu "File"
                  click
                  delay 0.1
                  click menu item "New ${escapedProfile} Window" of menu 1
                end tell
              end tell
            end tell
          end tell
        end tell
      `,
    );
  } else {
    await runAppleScript(
      `
        tell application "Dia"
          activate
          tell application "System Events"
            keystroke "n" using {command down}
          end tell
        end tell
      `,
    );
  }
}

export async function createNewIncognitoWindow() {
  await runAppleScript(
    `
      tell application "Dia"
        activate
        
        tell application "System Events"
          keystroke "n" using {command down, shift down}
        end tell
      end tell
    `,
  );
}

export async function getVersion() {
  const response = await runAppleScript(`
    set _output to ""

    tell application "Dia"
      return version
    end tell
  `);

  return response;
}
