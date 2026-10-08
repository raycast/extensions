import { open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { APPLESCRIPT_TIMEOUT_MS, ASIDE_BUNDLE_ID } from "./constants";
import type { AsideTabSnapshot } from "./types";
import { ASIDE_URL_SCHEMES, normalizeAsideURL } from "./url";

// AppleScript is the only reliable way to enumerate, focus, and close Aside
// tabs by a stable handle. Aside's scripting dictionary exposes `tab > id` as a
// unique-per-session string we can round-trip back into AS to act on the exact
// tab. URL-based matching breaks on duplicates.

function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export interface AsideTabSnapshotResult {
  browserStatus: "running" | "not_running";
  tabs: AsideTabSnapshot[];
}

export type AsideTabActionResult = "success" | "not_found" | "not_running" | "unsupported_url" | "failed";

async function runTabAction(script: string, operation: string): Promise<AsideTabActionResult> {
  try {
    const status = (await runAppleScript(script, { timeout: APPLESCRIPT_TIMEOUT_MS })).trim();
    return status === "success" || status === "not_found" || status === "not_running" || status === "unsupported_url"
      ? status
      : "failed";
  } catch (error) {
    console.error(`${operation}:`, error);
    return "failed";
  }
}

function parseSnapshotRecord(record: string): AsideTabSnapshot | undefined {
  const [id, title = "", url = "", active = "false", windowId = "", windowIndex, tabIndex, windowMode = ""] =
    record.split("\x1F");
  if (!id || !windowIndex || !tabIndex) return undefined;

  const parsedWindowIndex = Number(windowIndex);
  const parsedTabIndex = Number(tabIndex);
  if (!Number.isInteger(parsedWindowIndex) || !Number.isInteger(parsedTabIndex)) return undefined;

  return {
    id,
    title,
    url,
    isActive: active === "true",
    windowId,
    windowIndex: parsedWindowIndex,
    tabIndex: parsedTabIndex,
    windowMode,
  };
}

/** Read a complete live tab snapshot without activating Aside. */
export async function getAsideTabSnapshot(): Promise<AsideTabSnapshotResult> {
  const script = `
    set fieldSep to character id 31
    set recordSep to character id 30
    tell application "Aside"
      if not running then return "not_running"
      set output to {"running"}
      set windowPosition to 0
      repeat with w in windows
        set windowPosition to windowPosition + 1
        set wId to ""
        set wMode to ""
        set activeId to ""
        try
          set wId to id of w as text
        end try
        try
          set wMode to mode of w as text
        end try
        try
          set activeId to id of active tab of w as text
        end try
        set tabIds to id of every tab of w
        set tabTitles to title of every tab of w
        set tabUrls to URL of every tab of w
        repeat with tabPosition from 1 to count of tabIds
          set tId to ""
          try
            set tId to item tabPosition of tabIds as text
          end try
          if tId is not "" then
            set tTitle to ""
            set tUrl to ""
            try
              set tTitle to item tabPosition of tabTitles as text
            end try
            try
              set tUrl to item tabPosition of tabUrls as text
            end try
            set tActive to (tId is activeId) as text
            set end of output to tId & fieldSep & tTitle & fieldSep & tUrl & fieldSep & tActive & fieldSep & wId & fieldSep & windowPosition & fieldSep & tabPosition & fieldSep & wMode
          end if
        end repeat
      end repeat
      set AppleScript's text item delimiters to recordSep
      set serialized to output as text
      set AppleScript's text item delimiters to ""
      return serialized
    end tell
  `;

  const raw = await runAppleScript(script, { timeout: APPLESCRIPT_TIMEOUT_MS });
  if (raw.trim() === "not_running") return { browserStatus: "not_running", tabs: [] };

  const [status, ...records] = raw.split("\x1E");
  if (status !== "running") throw new Error("Aside returned an unreadable tab snapshot.");
  return {
    browserStatus: "running",
    tabs: records.map(parseSnapshotRecord).filter((tab): tab is AsideTabSnapshot => Boolean(tab)),
  };
}

/**
 * Focus a tab by its Aside id. Set the owning window's active tab index and
 * bring it forward because Aside does not expose a tab selection command.
 */
export async function focusAsideTabById(asideId: string): Promise<AsideTabActionResult> {
  const id = escape(asideId);
  const script = `
    tell application "Aside"
      if not running then return "not_running"
      set foundTab to false
      repeat with w in windows
        set tabIndex to 0
        repeat with t in tabs of w
          set tabIndex to tabIndex + 1
          try
            if (id of t as text) is "${id}" then
              set active tab index of w to tabIndex
              set index of w to 1
              activate
              set foundTab to true
              exit repeat
            end if
          end try
        end repeat
        if foundTab then exit repeat
      end repeat
      if foundTab then return "success" else return "not_found"
    end tell
  `;
  return runTabAction(script, "focusAsideTabById");
}

/**
 * Duplicate a tab by exact ID in its owning window. This preserves normal and
 * incognito window isolation without relying on Aside's broken duplicate verb.
 */
export async function duplicateAsideTabById(asideId: string): Promise<AsideTabActionResult> {
  const id = escape(asideId);
  const allowedUrlCondition = ASIDE_URL_SCHEMES.map((scheme) => `targetUrl starts with "${escape(scheme)}"`).join(
    " or ",
  );
  const script = `
    tell application "Aside"
      if not running then return "not_running"
      repeat with w in windows
        repeat with t in tabs of w
          try
            if (id of t as text) is "${id}" then
              set targetUrl to URL of t as text
              if targetUrl is "" then return "unsupported_url"
              if not (${allowedUrlCondition}) then return "unsupported_url"
              tell w to make new tab with properties {URL:targetUrl}
              set active tab index of w to count of tabs of w
              set index of w to 1
              activate
              return "success"
            end if
          end try
        end repeat
      end repeat
      return "not_found"
    end tell
  `;
  return runTabAction(script, "duplicateAsideTabById");
}

/**
 * Close a tab by its Aside id.
 */
export async function closeAsideTabById(asideId: string): Promise<AsideTabActionResult> {
  const id = escape(asideId);
  const script = `
    tell application "Aside"
      if not running then return "not_running"
      set foundTab to false
      repeat with w in windows
        repeat with t in tabs of w
          try
            if (id of t as text) is "${id}" then
              close t
              set foundTab to true
              exit repeat
            end if
          end try
        end repeat
        if foundTab then exit repeat
      end repeat
      if foundTab then return "success" else return "not_found"
    end tell
  `;
  return runTabAction(script, "closeAsideTabById");
}

/** Reload a tab by its current session-scoped Aside id. */
export async function reloadAsideTabById(asideId: string): Promise<AsideTabActionResult> {
  const id = escape(asideId);
  const script = `
    tell application "Aside"
      if not running then return "not_running"
      repeat with w in windows
        repeat with t in tabs of w
          try
            if (id of t as text) is "${id}" then
              reload t
              return "success"
            end if
          end try
        end repeat
      end repeat
      return "not_found"
    end tell
  `;
  return runTabAction(script, "reloadAsideTabById");
}

export async function closeAsideTabsById(asideIds: string[]): Promise<string[]> {
  const uniqueIds = [...new Set(asideIds)];
  if (uniqueIds.length === 0) return [];

  const idList = uniqueIds.map((id) => `"${escape(id)}"`).join(", ");
  const script = `
    set idsToClose to {${idList}}
    set closedIds to {}
    set sep to character id 31
    tell application "Aside"
      if not running then return ""
      repeat with windowIndex from (count windows) to 1 by -1
        set w to window windowIndex
        repeat with tabIndex from (count tabs of w) to 1 by -1
          try
            set t to tab tabIndex of w
            set tId to id of t as text
            if idsToClose contains tId then
              close t
              set end of closedIds to tId
            end if
          end try
        end repeat
      end repeat
    end tell
    set AppleScript's text item delimiters to sep
    set output to closedIds as text
    set AppleScript's text item delimiters to ""
    return output
  `;

  try {
    const raw = await runAppleScript(script, { timeout: APPLESCRIPT_TIMEOUT_MS });
    const closedIds = new Set(raw ? raw.split("\x1F") : []);
    return uniqueIds.filter((id) => !closedIds.has(id));
  } catch (error) {
    console.error("closeAsideTabsById:", error);
    return uniqueIds;
  }
}

/**
 * Open a URL as a new tab in the frontmost Aside window. Cold-start delegates
 * to the OS URL handler to avoid racing Aside's own default window.
 */
export async function openUrlInAside(url: string): Promise<void> {
  const normalizedUrl = normalizeAsideURL(url);
  const script = `
    on run argv
    set targetUrl to item 1 of argv
    if application "Aside" is not running then return "not_running"
    tell application "Aside"
      activate
      if (count of windows) is 0 then make new window
      tell window 1
        make new tab with properties {URL:targetUrl}
      end tell
    end tell
    return "opened"
    end run
  `;
  const result = await runAppleScript(script, [normalizedUrl], { timeout: APPLESCRIPT_TIMEOUT_MS });
  if (result.trim() === "not_running") await open(normalizedUrl, ASIDE_BUNDLE_ID);
}

export async function createNewTab(): Promise<void> {
  const script = `
    tell application "Aside"
      activate
      if (count of windows) is 0 then
        make new window
      else
        tell window 1 to make new tab
      end if
    end tell
  `;
  await runAppleScript(script, { timeout: APPLESCRIPT_TIMEOUT_MS });
}

export async function createNewWindow(): Promise<void> {
  const script = `
    tell application "Aside"
      make new window
      activate
    end tell
  `;
  await runAppleScript(script, { timeout: APPLESCRIPT_TIMEOUT_MS });
}

export async function createNewIncognitoWindow(): Promise<void> {
  const script = `
    tell application "Aside"
      make new window with properties {mode:"incognito"}
      activate
    end tell
  `;
  await runAppleScript(script, { timeout: APPLESCRIPT_TIMEOUT_MS });
}
