import { executeSQL, runAppleScript, showFailureToast, useCachedPromise, usePromise, useSQL } from "@raycast/utils";
import { resolve } from "path";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { execFileSync } from "child_process";
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
  /** Name of the Dia space (profile) the tab belongs to, when Dia reports it. */
  space?: string;
  /** Whether the tab's space is the one shown in its window. */
  isActiveSpace: boolean;
};

export type TabsOptions = {
  /** Include tabs from every space, not only the space active in each window. */
  allSpaces?: boolean;
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

function getHistoryQuery(searchText?: string, limit = 100, minSearchLength = 2) {
  // Skip filtered query for single-char searches while typing (too broad, wastes I/O)
  const effectiveSearch = searchText && searchText.trim().length >= minSearchLength ? searchText : undefined;
  const whereClause = effectiveSearch
    ? effectiveSearch
        .split(" ")
        .filter((word) => word.length > 0)
        .map((term) => {
          const escapedTerm = escapeSQLLikePattern(term);
          return `(url LIKE '%${escapedTerm}%' ESCAPE '\\' OR title LIKE '%${escapedTerm}%' ESCAPE '\\')`;
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

export const FULL_DISK_ACCESS_MESSAGE =
  "Raycast needs Full Disk Access to read Dia's data. Enable Raycast in System Settings → Privacy & Security → Full Disk Access, then try again.";

/** Async variant of useSearchHistory for AI tools, where hooks are unavailable. */
export async function searchHistory(searchText?: string, limit?: number): Promise<HistoryItem[]> {
  const historyPath = getHistoryPath();
  if (!existsSync(historyPath)) {
    // Without Full Disk Access the file can look missing rather than unreadable, so mention both causes
    throw new Error(
      `Dia's history database was not found. Make sure Dia has been opened at least once. ${FULL_DISK_ACCESS_MESSAGE}`,
    );
  }

  try {
    return await executeSQL<HistoryItem>(historyPath, getHistoryQuery(searchText, limit, 1));
  } catch (error) {
    if (error instanceof Error && (error.name === "PermissionError" || /EPERM|EACCES/.test(error.message))) {
      throw new Error(FULL_DISK_ACCESS_MESSAGE);
    }
    throw error;
  }
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

export async function getTabs(options: TabsOptions = {}): Promise<Tab[]> {
  // Bulk AppleScript (`properties of every tab`, one Apple Event per window or space) is about twice
  // as fast as JXA on Dia 1.56, where JXA has to read each tab's properties separately.
  // JXA stays as a fallback when the AppleScript output can't be parsed.
  try {
    return await getTabsBulkAppleScript(options);
  } catch {
    try {
      return await getTabsJXA(options);
    } catch {
      return [];
    }
  }
}

/** Runs JXA; `args` reach the script's `run(argv)` function, so data never becomes script source. */
function runJXA(script: string, timeout: number, args: string[] = []): string {
  return execFileSync("osascript", ["-l", "JavaScript", "-e", script, ...args], {
    timeout,
    encoding: "utf-8",
  }).trim();
}

/**
 * Turns empty URLs and space names into undefined, and keeps the first occurrence of each tab:
 * a space's pinned and favorite tabs can be listed under several windows.
 */
function normalizeTabs(tabs: Array<Required<Tab>>): Tab[] {
  const seen = new Set<string>();
  return tabs
    .filter((tab) => {
      if (seen.has(tab.tabId)) return false;
      seen.add(tab.tabId);
      return true;
    })
    .map((tab) => ({ ...tab, url: tab.url || undefined, space: tab.space || undefined }));
}

async function getTabsJXA({ allSpaces = false }: TabsOptions): Promise<Tab[]> {
  // A window's `tabs` element only holds its active space; each `profile` element holds one space's tabs.
  // Tab accessors such as isPinned() fail with "Can't convert types", so read everything through properties().
  const jxa = `
    (() => {
      const allSpaces = ${allSpaces ? "true" : "false"};
      const dia = Application("Dia");
      const wins = dia.windows();
      const tabs = [];
      for (let i = 0; i < wins.length; i++) {
        const w = wins[i];
        try {
          const wId = String(w.id());
          let activeSpace = "";
          try { activeSpace = w.activeProfile.name() || ""; } catch(e) {}
          const sources = [];
          if (allSpaces) {
            const profiles = w.profiles();
            for (let p = 0; p < profiles.length; p++) {
              try { sources.push({ space: profiles[p].name() || "", tabs: profiles[p].tabs() }); } catch(e) {}
            }
          } else {
            sources.push({ space: activeSpace, tabs: w.tabs() });
          }
          for (let s = 0; s < sources.length; s++) {
            const source = sources[s];
            const isActiveSpace = !allSpaces || source.space === activeSpace;
            for (let j = 0; j < source.tabs.length; j++) {
              try {
                const props = source.tabs[j].properties();
                tabs.push({
                  windowId: wId,
                  tabId: String(props.id),
                  title: props.title || "",
                  url: props.url || "",
                  isPinned: !!props.ispinned,
                  isFocused: !!props.isfocused,
                  space: source.space,
                  isActiveSpace,
                });
              } catch(e) {}
            }
          }
        } catch(e) {}
      }
      return JSON.stringify(tabs);
    })()
  `;

  return normalizeTabs(JSON.parse(runJXA(jxa, 5000)) as Array<Required<Tab>>);
}

async function getTabsBulkAppleScript({ allSpaces = false }: TabsOptions): Promise<Tab[]> {
  // Bulk fetch using `properties of every tab` — one IPC call per window (or per space)
  // instead of N calls per tab. 10-14x faster than nested repeat loops.
  const collectTabs = `
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
                set _output to (_output & "{\\"windowId\\": \\"" & wId & "\\", \\"tabId\\": \\"" & _id & "\\", \\"title\\": \\"" & _title & "\\", \\"url\\": \\"" & _url & "\\", \\"isPinned\\": " & _isPinned & ", \\"isFocused\\": " & _isFocused & ", \\"space\\": \\"" & _space & "\\", \\"isActiveSpace\\": " & _isActiveSpace & "}")
              on error
                (* skip this tab, avoid dangling comma *)
              end try
            end repeat`;

  const windowBody = allSpaces
    ? `
            repeat with p in every profile of w
              try
                set _space to my escape_value(get name of p)
                set _isActiveSpace to (_space is _activeSpace)
                set allTabs to properties of every tab of p
                ${collectTabs}
              end try
            end repeat`
    : `
            set _space to _activeSpace
            set _isActiveSpace to true
            set allTabs to properties of every tab of w
            ${collectTabs}`;

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
            set _activeSpace to ""
            try
              set _activeSpace to my escape_value(get name of active profile of w)
            end try
            ${windowBody}
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

  const parsed = JSON.parse(sanitized) as Array<Required<Tab>>;

  return normalizeTabs(parsed);
}

export type Spaces = {
  /** Space names in Dia's sidebar order, including spaces without tabs. */
  names: string[];
  /** Space shown in each window, by window ID. */
  activeByWindow: Record<string, string>;
};

/** Reads Dia's spaces from the front window, plus the space each window shows. */
export async function getSpaces(): Promise<Spaces> {
  // Unit (31) and record (30) separators keep names intact without escaping
  const result = await runAppleScript(`
    set _us to character id 31
    set _rs to character id 30
    set _names to ""
    set _active to ""
    tell application "Dia"
      if (count of windows) is 0 then return ""
      repeat with p in every profile of window 1
        set _names to _names & (name of p) & _us
      end repeat
      repeat with w in every window
        try
          set _active to _active & (id of w) & _us & (name of active profile of w) & _rs
        end try
      end repeat
    end tell
    return _names & _rs & _active
  `);
  const [namesPart = "", ...activeParts] = result.split("\x1e");
  const activeByWindow: Record<string, string> = {};
  for (const record of activeParts) {
    const [windowId, name] = record.split("\x1f");
    if (windowId && name) activeByWindow[windowId] = name;
  }
  return { names: namesPart.split("\x1f").filter(Boolean), activeByWindow };
}

/** Returns the focused tab, preferring the frontmost window when several windows report one. */
export async function getFocusedTab(): Promise<Tab | undefined> {
  const focusedTabs = (await getTabs()).filter((tab) => tab.isFocused);
  if (focusedTabs.length <= 1) return focusedTabs[0];

  const frontWindowId = (await runAppleScript(`tell application "Dia" to return id of window 1`)).trim();
  return focusedTabs.find((tab) => tab.windowId === frontWindowId) ?? focusedTabs[0];
}

export function useTabs(options: TabsOptions = {}) {
  // Pass the option as an argument so each mode keeps its own cache entry
  return useCachedPromise((allSpaces: boolean) => getTabs({ allSpaces }), [options.allSpaces ?? false]);
}

export function useBookmarks(searchText?: string) {
  return usePromise(async (query: string) => searchBookmarks(query), [searchText || ""], {
    execute: !!searchText && searchText.trim().length > 0,
  });
}

/**
 * JXA that finds a tab by ID, checking the tab's own window first, then every window.
 * Each window is searched in its active space (`tabs`) and then in every space (`profiles`), so tabs
 * from inactive spaces are found too. `onFound` is JXA run with `dia`, `w`, `t`, and `p`
 * (the space holding the tab, or null when the tab is in the window's active space), and must return a string.
 * Run it with `findTabArgs(tab)`.
 */
function findTabJXA(onFound: string) {
  return `
    function run(argv) {
      const dia = Application("Dia");
      const windowId = argv[0];
      const tabId = argv[1];
      const wins = dia.windows();
      const ordered = [];
      for (let i = 0; i < wins.length; i++) {
        if (String(wins[i].id()) === windowId) ordered.unshift(wins[i]); else ordered.push(wins[i]);
      }
      const found = (w, t, p) => { ${onFound} };
      for (let i = 0; i < ordered.length; i++) {
        const w = ordered[i];
        const j = w.tabs.id().map(String).indexOf(tabId);
        if (j >= 0) return found(w, w.tabs[j], null);
      }
      for (let i = 0; i < ordered.length; i++) {
        const w = ordered[i];
        const profiles = w.profiles();
        for (let k = 0; k < profiles.length; k++) {
          const j = profiles[k].tabs.id().map(String).indexOf(tabId);
          if (j >= 0) return found(w, profiles[k].tabs[j], profiles[k]);
        }
      }
      return "not_found";
    }
  `;
}

/** Window and tab IDs passed to findTabJXA and findTabAppleScript scripts. */
function findTabArgs(tab: Tab) {
  return [tab.windowId, tab.tabId];
}

/**
 * AppleScript counterpart of findTabJXA. `onFound` runs inside `tell application "Dia"` with `w`, `t`, and `p` set.
 * Run it with `findTabArgs(tab)`.
 */
function findTabAppleScript(onFound: string) {
  return `
  on run argv
    set _windowId to item 1 of argv
    set _tabId to item 2 of argv
    set _result to "not_found"
    tell application "Dia"
      set _windows to {}
      repeat with w in every window
        if id of w is _windowId then
          set beginning of _windows to contents of w
        else
          set end of _windows to contents of w
        end if
      end repeat
      repeat with w in _windows
        repeat with t in every tab of w
          if id of t is _tabId then
            set p to missing value
            ${onFound}
            return _result
          end if
        end repeat
      end repeat
      repeat with w in _windows
        repeat with p in every profile of w
          repeat with t in every tab of p
            if id of t is _tabId then
              ${onFound}
              return _result
            end if
          end repeat
        end repeat
      end repeat
    end tell
    return _result
  end run
  `;
}

/**
 * Focuses a tab and brings Dia to the front. A tab from an inactive space is focused by switching
 * its window to that space first.
 *
 * @throws TabNotFoundError when no open tab has the tab's ID.
 */
export async function focusTab(tab: Tab) {
  let result: string;
  try {
    result = runJXA(
      findTabJXA(
        `
        dia.activate();
        if (p) {
          p.focus();
          const j = w.tabs.id().map(String).indexOf(tabId);
          if (j >= 0) { w.tabs[j].focus(); return "ok"; }
        }
        t.focus();
        return "ok";
        `,
      ),
      3000,
      findTabArgs(tab),
    );
  } catch {
    // JXA unavailable — fall back to AppleScript
    result = (
      await runAppleScript(
        findTabAppleScript(
          `activate
            if p is not missing value then focus p
            focus t
            set _result to "ok"`,
        ),
        findTabArgs(tab),
      )
    ).trim();
  }

  if (result !== "ok") {
    throw new TabNotFoundError();
  }
}

/**
 * Switches a window to a space and brings Dia to the front, like picking the space in Dia's sidebar.
 * Falls back to the front window when the window is gone.
 */
export async function focusSpace(spaceName: string, windowId: string) {
  await runAppleScript(
    `
    on run argv
      set _spaceName to item 1 of argv
      set _windowId to item 2 of argv
      tell application "Dia"
        set _window to window 1
        repeat with w in every window
          if id of w is _windowId then
            set _window to contents of w
            exit repeat
          end if
        end repeat
        activate
        focus profile _spaceName of _window
      end tell
    end run
  `,
    [spaceName, windowId],
  );
}

/** Thrown when a tab's window/tab IDs no longer match a live tab in Dia (stale cache or already closed). */
export class TabNotFoundError extends Error {
  constructor() {
    super("Tab not found; it may have already been closed.");
    this.name = "TabNotFoundError";
  }
}

export async function closeTab(tab: Tab) {
  let result: string;
  try {
    // No activate: closing a tab leaves Dia in the background
    result = runJXA(findTabJXA(`t.close(); return "ok";`), 3000, findTabArgs(tab));
  } catch {
    // JXA unavailable — fall back to AppleScript, which reports its own outcome
    result = (
      await runAppleScript(
        findTabAppleScript(
          `close t
            set _result to "ok"`,
        ),
        findTabArgs(tab),
      )
    ).trim();
  }

  // IDs no longer match a live tab — throw a typed error so the optimistic caller can
  // revalidate against real state instead of leaving the row removed while it's still open.
  if (result !== "ok") {
    throw new TabNotFoundError();
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
