import { runAppleScript, usePromise, useSQL } from "@raycast/utils";
import { resolve } from "path";
import { homedir } from "os";
import { readFileSync } from "fs";
import dedent from "dedent";
import { escapeAppleScriptString, escapeSQLLikePattern } from "./utils";

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

function parseAppleScriptBoolean(value: string): boolean {
  return value.toLowerCase() === "true";
}

function getHistoryQuery(searchText?: string, limit = 100) {
  const whereClause = searchText
    ? searchText
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

  return useSQL<HistoryItem>(historyPath, historyQuery, {
    permissionPriming: "This extension needs access to read your Dia browser history.",
  });
}

async function getTabs() {
  const result = await runAppleScript(
    dedent`
      tell application "Dia"
        set output to ""
        
        repeat with w in every window
          try
            set wId to id of w
            
            repeat with t in every tab of w
              set tId to id of t
              set tabTitle to title of t
              
              try
                set tabURL to URL of t
                if tabURL is missing value then
                  set tabURL to ""
                end if
              on error
                set tabURL to ""
              end try
              
              set tabPinned to isPinned of t
              set tabFocused to isFocused of t
              
              -- Output: windowId|||tabId|||title|||url|||isPinned|||isFocused
              set output to output & wId & "|||" & tId & "|||" & tabTitle & "|||" & tabURL & "|||" & tabPinned & "|||" & tabFocused & "\\n"
            end repeat
          end try
        end repeat
        
        return output
      end tell
    `,
  );
  const tabs: Tab[] = [];
  const lines = result.trim().split("\n");

  for (const line of lines) {
    if (line) {
      // Format: windowId|||tabId|||title|||url|||isPinned|||isFocused
      const parts = line.split("|||");
      if (parts.length === 6) {
        const [windowId, tabId, title, url, isPinned, isFocused] = parts;
        tabs.push({
          windowId,
          tabId,
          title,
          url: url || undefined, // Empty string becomes undefined
          isPinned: parseAppleScriptBoolean(isPinned),
          isFocused: parseAppleScriptBoolean(isFocused),
        });
      }
    }
  }

  return tabs;
}

export function useTabs() {
  return usePromise(getTabs);
}

export async function focusTab(tab: Tab) {
  // Escape user input to prevent AppleScript injection
  const escapedWindowId = escapeAppleScriptString(tab.windowId);
  const escapedTabId = escapeAppleScriptString(tab.tabId);

  await runAppleScript(
    dedent`
      tell application "Dia"
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
      end tell
    `,
  );
}

export async function openNewTab(url: string) {
  await runAppleScript(
    dedent`
      tell application "Dia"
        activate

        tell window 1
          make new tab with properties {URL:"${url}"}
        end tell
      end tell
    `,
  );
}

export async function createNewWindow(profile?: string) {
  if (profile) {
    // Escape user input to prevent AppleScript injection
    const escapedProfile = escapeAppleScriptString(profile);

    await runAppleScript(
      dedent`
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
      dedent`
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
    dedent`
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
