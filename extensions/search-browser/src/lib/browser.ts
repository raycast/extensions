import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { Toast, getApplications, open, showToast } from "@raycast/api";
import {
  RECORD_SEP,
  SearchAppPrefs,
  computeTabSwitchSteps,
  extractAppleScriptErrorMessage,
  getCommandNumberKeyCode,
  isAccessibilityPermissionError,
  isAutomationPermissionError,
  parseAppleScriptTabs,
  parseSearchAppPrefsXml,
} from "./applescript-parser";
import { SEARCH_BUNDLE_ID, SEARCH_DOWNLOAD_URL } from "./constants";
import { readSessionTabs } from "./storage";
import { OpenTabsResult, SearchTab } from "./types";

const execFileAsync = promisify(execFile);

export {
  computeTabSwitchSteps,
  extractAppleScriptErrorMessage,
  getCommandNumberKeyCode,
  isAccessibilityPermissionError,
  isAutomationPermissionError,
  parseAppleScriptTabs,
  parseSearchAppPrefsXml,
};

/**
 * Run an AppleScript via `osascript`, throwing an Error whose message contains ONLY stderr
 * (never the full `osascript -e <script>` command string).
 */
async function runAppleScript(script: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script], {
      timeout: 8000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    throw new Error(extractAppleScriptErrorMessage(error));
  }
}

function appHasBundleId(appPath: string, bundleId: string): boolean {
  try {
    const plistPath = path.join(appPath, "Contents", "Info.plist");
    if (!fs.existsSync(plistPath)) return false;
    const raw = fs.readFileSync(plistPath, "utf8");
    return raw.includes(`<string>${bundleId}</string>`);
  } catch {
    return false;
  }
}

/**
 * Check whether Search Browser is installed on this Mac (verifying CFBundleIdentifier on the fast path).
 */
export async function isSearchBrowserInstalled(): Promise<boolean> {
  const candidates = ["/Applications/Search.app", path.join(os.homedir(), "Applications", "Search.app")];
  for (const appPath of candidates) {
    if (appHasBundleId(appPath, SEARCH_BUNDLE_ID)) {
      return true;
    }
  }
  try {
    const apps = await getApplications();
    return apps.some((app) => app.bundleId === SEARCH_BUNDLE_ID);
  } catch {
    return false;
  }
}

/**
 * Show a consistent failure toast with a direct download action when Search Browser is not installed.
 */
export async function showNotInstalledToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Search Browser is not installed",
    message: "Download it from searchbrowser.app",
    primaryAction: {
      title: "Download Search Browser",
      onAction: () => open(SEARCH_DOWNLOAD_URL),
    },
  });
}

/**
 * Check whether Search Browser is currently running (does not launch the app).
 */
export async function isSearchBrowserRunning(): Promise<boolean> {
  try {
    const result = await runAppleScript(`application id "${SEARCH_BUNDLE_ID}" is running`);
    return result.trim().toLowerCase() === "true";
  } catch {
    return false;
  }
}

let cachedAppPrefs: { checkedAt: number; value: SearchAppPrefs } | null = null;
const PREF_CACHE_TTL_MS = 10_000;

/**
 * Read Search Browser's live macOS preferences via `defaults export com.officecommun.search -` (XML1).
 * Works reliably even when the plist contains Date/Data values that `plutil -convert json` rejects.
 */
export async function readSearchAppPrefs(): Promise<SearchAppPrefs> {
  const now = Date.now();
  if (cachedAppPrefs && now - cachedAppPrefs.checkedAt < PREF_CACHE_TTL_MS) {
    return cachedAppPrefs.value;
  }

  try {
    const { stdout } = await execFileAsync("defaults", ["export", SEARCH_BUNDLE_ID, "-"], {
      timeout: 1500,
      maxBuffer: 2 * 1024 * 1024,
    });
    const value = parseSearchAppPrefsXml(stdout);
    cachedAppPrefs = { checkedAt: now, value };
    return value;
  } catch {
    const fallback: SearchAppPrefs = {
      linksLittle: true,
      linksReuseTabs: false,
      spacesUseCommandNumbers: false,
    };
    cachedAppPrefs = { checkedAt: now, value: fallback };
    return fallback;
  }
}

const NOT_RUNNING_SENTINEL = "__SEARCH_NOT_RUNNING__";

/**
 * Fetch live open tabs from Search Browser in ONE single osascript invocation.
 * Checks `is not running` inside the same script so Search is never launched and we avoid
 * paying a second osascript cold-start penalty.
 */
async function queryLiveOpenTabsSingleShot(): Promise<{ tabs: SearchTab[]; isRunning: boolean }> {
  const script = `
if application id "${SEARCH_BUNDLE_ID}" is not running then return "${NOT_RUNNING_SENTINEL}"
set fieldSep to character id 31
set recordSep to character id 30
set output to ""
tell application id "${SEARCH_BUNDLE_ID}"
  repeat with w in windows
    set wid to 0
    try
      set wid to id of w
    end try
    set sp to ""
    try
      set spVal to space of w
      if spVal is not missing value then set sp to spVal as text
    end try
    set pr to ""
    try
      set prVal to profile of w
      if prVal is not missing value then set pr to prVal as text
    end try
    set ct to missing value
    try
      set ct to current tab of w
    end try
    set tabRefs to {}
    set tabUrls to {}
    set tabNames to {}
    try
      set tabRefs to tabs of w
      set tabUrls to URL of tabs of w
      set tabNames to name of tabs of w
    end try
    set activeIdx to 0
    if ct is not missing value then
      repeat with i from 1 to count of tabRefs
        try
          if item i of tabRefs is ct then
            set activeIdx to i
            exit repeat
          end if
        end try
      end repeat
    end if
    repeat with i from 1 to count of tabUrls
      set tUrl to ""
      set tName to ""
      try
        set rawUrl to item i of tabUrls
        if rawUrl is not missing value then set tUrl to rawUrl as text
      end try
      try
        set rawName to item i of tabNames
        if rawName is not missing value then set tName to rawName as text
      end try
      set isActive to "0"
      if i is activeIdx then set isActive to "1"
      set output to output & wid & fieldSep & i & fieldSep & sp & fieldSep & pr & fieldSep & isActive & fieldSep & tName & fieldSep & tUrl & recordSep
    end repeat
  end repeat
end tell
return output
`;

  const raw = await runAppleScript(script);
  if (raw.trim() === NOT_RUNNING_SENTINEL) {
    return { tabs: [], isRunning: false };
  }
  return { tabs: parseAppleScriptTabs(raw), isRunning: true };
}

/**
 * Return live open tabs if Search is running, otherwise fall back to saved session tabs from disk.
 * Surfaces Automation permission denials explicitly instead of masking stale session tabs as live.
 */
export async function getOpenTabsWithFallback(): Promise<OpenTabsResult> {
  // Warm preferences cache in the background without blocking tab listing
  void readSearchAppPrefs();

  try {
    const { tabs, isRunning } = await queryLiveOpenTabsSingleShot();
    if (!isRunning) {
      return { tabs: readSessionTabs(), isRunning: false, permissionDenied: false };
    }
    return { tabs, isRunning: true, permissionDenied: false };
  } catch (error) {
    if (isAutomationPermissionError(error)) {
      return { tabs: readSessionTabs(), isRunning: true, permissionDenied: true };
    }
    return { tabs: readSessionTabs(), isRunning: false, permissionDenied: false };
  }
}

/**
 * Return the currently active tab in Search Browser's frontmost browser window in a single osascript call.
 * Iterates through windows so non-browser windows (Settings, Downloads, History) don't cause an error.
 */
export async function getFocusedTab(): Promise<SearchTab | null> {
  const script = `
if application id "${SEARCH_BUNDLE_ID}" is not running then return "${NOT_RUNNING_SENTINEL}"
set fieldSep to character id 31
tell application id "${SEARCH_BUNDLE_ID}"
  repeat with w in windows
    try
      set ct to current tab of w
      if ct is not missing value then
        set tUrl to ""
        set tName to ""
        try
          set rawUrl to URL of ct
          if rawUrl is not missing value then set tUrl to rawUrl as text
        end try
        try
          set rawName to name of ct
          if rawName is not missing value then set tName to rawName as text
        end try
        if tUrl is not "" then
          set wid to 0
          try
            set wid to id of w
          end try
          set sp to ""
          try
            set spVal to space of w
            if spVal is not missing value then set sp to spVal as text
          end try
          set pr to ""
          try
            set prVal to profile of w
            if prVal is not missing value then set pr to prVal as text
          end try
          return (wid as text) & fieldSep & "1" & fieldSep & sp & fieldSep & pr & fieldSep & "1" & fieldSep & tName & fieldSep & tUrl
        end if
      end if
    end try
  end repeat
  return ""
end tell
`;

  const raw = await runAppleScript(script);
  if (raw.trim() === NOT_RUNNING_SENTINEL) return null;
  const parsed = parseAppleScriptTabs(raw + RECORD_SEP);
  return parsed[0] ?? null;
}

/**
 * Focus an existing open tab in Search Browser as quickly and reliably as possible without
 * opening a duplicate tab or Little Window.
 *
 * Fast paths:
 * 1. Native Search tab reuse (`links.little = false` & `links.little.tabs = true`) -> `open -b <url>` (~70ms, all windows/spaces).
 * 2. Verified hardware `key code` Cmd+1..9 jump -> verifies live URL at target index before pressing Cmd+N (~140ms).
 * 3. Live active-index query + `Tabs -> Next Tab / Previous Tab` menu steps (scans all windows if tab moved).
 */
export async function focusOpenTab(
  tab: SearchTab,
  options: { hasPinnedTabs?: boolean; skipFastKeyCode?: boolean } = {}
): Promise<void> {
  const prefs = await readSearchAppPrefs();

  // Tier 1: Search's native "Go to a tab that has the page" with Small Windows disabled (~70ms, idempotent)
  if (!prefs.linksLittle && prefs.linksReuseTabs) {
    await openUrlInSearch(tab.url);
    return;
  }

  const escapedUrl = tab.url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const cmdKeyCode = options.skipFastKeyCode
    ? null
    : getCommandNumberKeyCode(tab, {
        spacesUseCommandNumbers: prefs.spacesUseCommandNumbers,
        hasPinnedTabs: Boolean(options.hasPinnedTabs),
      });

  // Tier 2: Verified hardware Cmd+1..9 jump (checks live window + URL at tabIndex so reordered/closed tabs never misfire)
  if (cmdKeyCode !== null) {
    const verifiedKeyScript = `
set targetWinId to ${Math.max(0, Math.floor(tab.windowId))}
set targetIdx to ${Math.max(1, Math.floor(tab.tabIndex))}
set targetUrl to "${escapedUrl}"

tell application id "${SEARCH_BUNDLE_ID}"
  if not running then error "SEARCH_NOT_RUNNING"
  set matchedWin to missing value
  set matchedWinTitle to ""
  set winCount to count of windows
  repeat with w in windows
    try
      if (id of w) is targetWinId then
        set matchedWin to w
        exit repeat
      end if
    end try
  end repeat
  if matchedWin is missing value then error "INDEX_STALE"
  set tabUrls to URL of tabs of matchedWin
  if targetIdx > (count of tabUrls) then error "INDEX_STALE"
  considering case
    if (item targetIdx of tabUrls as text) is not targetUrl then error "INDEX_STALE"
  end considering
  try
    set ct to current tab of matchedWin
    if ct is not missing value then
      set rawCtName to name of ct
      if rawCtName is not missing value then set matchedWinTitle to rawCtName as text
    end if
  end try
  activate
end tell

tell application "System Events"
  set procs to (every application process whose bundle identifier is "${SEARCH_BUNDLE_ID}")
  if (count of procs) is 0 then error "PROCESS_NOT_FOUND"
  set targetProc to item 1 of procs
  tell targetProc
    set frontmost to true
    if winCount > 1 then
      set raisedWin to false
      if matchedWinTitle is not "" then
        repeat with sw in windows
          try
            if (subrole of sw is "AXStandardWindow") and ((name of sw as text) is matchedWinTitle) then
              perform action "AXRaise" of sw
              set raisedWin to true
              exit repeat
            end if
          end try
        end repeat
      end if
      if not raisedWin then error "WINDOW_NOT_RAISED"
    end if
    repeat 15 times
      if frontmost then exit repeat
      delay 0.02
    end repeat
  end tell
  key code ${cmdKeyCode} using command down
end tell
`;
    try {
      await runAppleScript(verifiedKeyScript);
      return;
    } catch (err) {
      const msg = extractAppleScriptErrorMessage(err);
      if (isAccessibilityPermissionError(err)) {
        throw new Error(
          "Grant Raycast Accessibility permission in System Settings → Privacy & Security → Accessibility to switch directly to background tabs."
        );
      }
      if (msg.includes("WINDOW_NOT_RAISED") || msg.includes("SEARCH_NOT_RUNNING")) {
        await openUrlInSearch(tab.url);
        return;
      }
      if (!msg.includes("INDEX_STALE")) {
        throw err;
      }
      // Fall through to Tier 3 when tab moved/reordered
    }
  }

  // Tier 3: Query live active index across all windows (handles moved tabs too) + Next/Previous Tab steps
  const stepScript = `
set targetWinId to ${Math.max(0, Math.floor(tab.windowId))}
set hintTabIdx to ${Math.max(1, Math.floor(tab.tabIndex))}
set targetUrl to "${escapedUrl}"

tell application id "${SEARCH_BUNDLE_ID}"
  if not running then error "SEARCH_NOT_RUNNING"
  set matchedWin to missing value
  set matchedWinTitle to ""
  set winCount to count of windows
  set activeIdx to 0
  set targetIdx to 0

  -- First try the original window ID and verify it still holds targetUrl
  considering case
    repeat with w in windows
      set wid to 0
      try
        set wid to id of w
      end try
      if wid is targetWinId then
        try
          set urls to URL of tabs of w
          if hintTabIdx <= (count of urls) and ((item hintTabIdx of urls as text) is targetUrl) then
            set matchedWin to w
            set targetIdx to hintTabIdx
          else
            repeat with i from 1 to count of urls
              if (item i of urls as text) is targetUrl then
                set matchedWin to w
                set targetIdx to i
                exit repeat
              end if
            end repeat
          end if
        end try
        exit repeat
      end if
    end repeat

    -- If the tab moved to another window, search every window
    if matchedWin is missing value then
      repeat with w in windows
        try
          set urls to URL of tabs of w
          repeat with i from 1 to count of urls
            if (item i of urls as text) is targetUrl then
              set matchedWin to w
              set targetIdx to i
              exit repeat
            end if
          end repeat
        end try
        if matchedWin is not missing value then exit repeat
      end repeat
    end if
  end considering

  if matchedWin is missing value then error "TAB_NOT_FOUND"

  set tabRefs to tabs of matchedWin
  set ct to missing value
  try
    set ct to current tab of matchedWin
  end try

  if ct is not missing value then
    try
      set rawCtName to name of ct
      if rawCtName is not missing value then set matchedWinTitle to rawCtName as text
    end try
    repeat with i from 1 to count of tabRefs
      try
        if item i of tabRefs is ct then
          set activeIdx to i
          exit repeat
        end if
      end try
    end repeat
  end if

  if activeIdx is 0 then error "ACTIVE_TAB_UNKNOWN"
  activate
end tell

set delta to targetIdx - activeIdx

tell application "System Events"
  set procs to (every application process whose bundle identifier is "${SEARCH_BUNDLE_ID}")
  if (count of procs) is 0 then error "PROCESS_NOT_FOUND"
  tell item 1 of procs
    set frontmost to true
    if winCount > 1 then
      set raisedWin to false
      if matchedWinTitle is not "" then
        repeat with sw in windows
          try
            if (subrole of sw is "AXStandardWindow") and ((name of sw as text) is matchedWinTitle) then
              perform action "AXRaise" of sw
              set raisedWin to true
              exit repeat
            end if
          end try
        end repeat
      end if
      if not raisedWin then error "WINDOW_NOT_RAISED"
    end if
    if delta > 0 then
      repeat delta times
        click menu item "Next Tab" of menu "Tabs" of menu bar 1
      end repeat
    else if delta < 0 then
      repeat (-delta) times
        click menu item "Previous Tab" of menu "Tabs" of menu bar 1
      end repeat
    end if
  end tell
end tell
`;

  try {
    await runAppleScript(stepScript);
  } catch (err) {
    const message = extractAppleScriptErrorMessage(err);
    if (
      message.includes("SEARCH_NOT_RUNNING") ||
      message.includes("TAB_NOT_FOUND") ||
      message.includes("ACTIVE_TAB_UNKNOWN") ||
      message.includes("WINDOW_NOT_RAISED")
    ) {
      await openUrlInSearch(tab.url);
      return;
    }
    if (isAccessibilityPermissionError(err)) {
      throw new Error(
        "Grant Raycast Accessibility permission in System Settings → Privacy & Security → Accessibility to switch directly to background tabs."
      );
    }
    throw err;
  }
}

/**
 * Open a URL in Search Browser via LaunchServices (no Accessibility permission required).
 */
export async function openUrlInSearch(url: string): Promise<void> {
  await execFileAsync("open", ["-b", SEARCH_BUNDLE_ID, url]);
}

/**
 * Launch or bring Search Browser to the front.
 */
export async function activateSearchBrowser(): Promise<void> {
  await execFileAsync("open", ["-b", SEARCH_BUNDLE_ID]);
}

/**
 * Trigger a Search Browser menu bar item (e.g. File -> New Window / New Tab / New Private Tab / Reopen Closed Tab).
 * Polls until the Search process and menu bar are ready after a cold launch, and checks item enabled state.
 */
export async function triggerSearchMenuItem(
  menuName: "File" | "Tabs" | "Bookmarks" | "History" | "View",
  itemName: string
): Promise<void> {
  const safeMenu = menuName.replace(/"/g, '\\"');
  const safeItem = itemName.replace(/"/g, '\\"');

  const script = `
tell application id "${SEARCH_BUNDLE_ID}" to activate
tell application "System Events"
  set targetProc to missing value
  repeat 30 times
    set procs to (every application process whose bundle identifier is "${SEARCH_BUNDLE_ID}")
    if (count of procs) > 0 then
      set candidate to item 1 of procs
      try
        if (count of menu bar items of menu bar 1 of candidate) > 0 then
          set targetProc to candidate
          exit repeat
        end if
      end try
    end if
    delay 0.1
  end repeat
  if targetProc is missing value then
    error "SEARCH_NOT_READY"
  end if
  tell targetProc
    set frontmost to true
    set targetItem to menu item "${safeItem}" of menu "${safeMenu}" of menu bar 1
    if not (enabled of targetItem) then
      error "MENU_ITEM_DISABLED"
    end if
    click targetItem
  end tell
end tell
`;

  try {
    await runAppleScript(script);
  } catch (err) {
    const message = extractAppleScriptErrorMessage(err);
    if (message.includes("MENU_ITEM_DISABLED")) {
      throw new Error(`"${itemName}" is currently unavailable in Search Browser.`);
    }
    if (message.includes("SEARCH_NOT_READY")) {
      throw new Error("Search Browser did not become ready in time.");
    }
    if (isAccessibilityPermissionError(err)) {
      throw new Error(
        `Grant Raycast Accessibility permission in System Settings → Privacy & Security → Accessibility to trigger "${itemName}".`
      );
    }
    throw err;
  }
}

/**
 * Create a new Search Browser window.
 */
export async function createNewWindow(): Promise<void> {
  await triggerSearchMenuItem("File", "New Window");
}

/**
 * Open a new blank tab in Search Browser.
 */
export async function createNewTab(): Promise<void> {
  await triggerSearchMenuItem("File", "New Tab");
}

/**
 * Open a new private tab in Search Browser.
 */
export async function createNewPrivateTab(): Promise<void> {
  await triggerSearchMenuItem("File", "New Private Tab");
}

/**
 * Reopen the most recently closed tab in Search Browser.
 */
export async function reopenClosedTab(): Promise<void> {
  await triggerSearchMenuItem("File", "Reopen Closed Tab");
}
