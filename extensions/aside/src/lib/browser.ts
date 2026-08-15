import { runAppleScript } from "@raycast/utils";
import { ASIDE_BUNDLE_ID } from "../constants";
import { AsideBookmark, AsideTab, BrowserMutationResult } from "../types";
import { appleScriptString, ENSURE_USABLE_WINDOW, JSON_HELPERS } from "./applescript";
import { normalizeAsideError, parseJsonResponse } from "./errors";

const APP_TELL = `application id "${ASIDE_BUNDLE_ID}"`;

async function execute(script: string): Promise<string> {
  try {
    return await runAppleScript(script);
  } catch (error) {
    throw normalizeAsideError(error);
  }
}

export async function listTabs(): Promise<AsideTab[]> {
  const response = await execute(String.raw`
${JSON_HELPERS}
${ENSURE_USABLE_WINDOW}
set json_items to {}
using terms from application "Aside"
  tell ${APP_TELL}
    repeat with browser_window in every window
      set window_id to id of browser_window as text
      set window_index to index of browser_window
      set window_mode to mode of browser_window as text
      set active_tab_id to ""
      try
        set active_tab_id to id of active tab of browser_window as text
      end try
      repeat with browser_tab in every tab of browser_window
        set tab_id to id of browser_tab as text
        set tab_title to title of browser_tab
        set tab_url to URL of browser_tab
        set tab_loading to loading of browser_tab
        set tab_active to (tab_id is active_tab_id)
        set end of json_items to "{\"id\":" & my json_string(tab_id) & ",\"windowId\":" & my json_string(window_id) & ",\"windowIndex\":" & window_index & ",\"windowMode\":" & my json_string(window_mode) & ",\"title\":" & my json_string(tab_title) & ",\"url\":" & my json_string(tab_url) & ",\"loading\":" & tab_loading & ",\"active\":" & tab_active & "}"
      end repeat
    end repeat
  end tell
end using terms from
set previous_delimiters to AppleScript's text item delimiters
set AppleScript's text item delimiters to ","
set json_output to json_items as text
set AppleScript's text item delimiters to previous_delimiters
return "[" & json_output & "]"
`);

  return parseJsonResponse<AsideTab[]>(response, "tab list");
}

function bookmarkWalkerScript(): string {
  return String.raw`
on collect_bookmarks(bookmark_folder, parent_path, json_items)
  using terms from application "Aside"
    tell ${APP_TELL}
      set folder_title to title of bookmark_folder
      if folder_title is missing value then set folder_title to "Bookmarks"
      set folder_path to parent_path & {folder_title as text}
      repeat with bookmark_entry in every bookmark item of bookmark_folder
        set bookmark_id to id of bookmark_entry as text
        set bookmark_title to title of bookmark_entry
        set bookmark_url to URL of bookmark_entry
        set path_items to {}
        repeat with path_part in folder_path
          set end of path_items to my json_string(path_part as text)
        end repeat
        set previous_delimiters to AppleScript's text item delimiters
        set AppleScript's text item delimiters to ","
        set path_json to path_items as text
        set AppleScript's text item delimiters to previous_delimiters
        set end of json_items to "{\"id\":" & my json_string(bookmark_id) & ",\"title\":" & my json_string(bookmark_title) & ",\"url\":" & my json_string(bookmark_url) & ",\"path\":[" & path_json & "]}"
      end repeat
      repeat with child_folder in every bookmark folder of bookmark_folder
        my collect_bookmarks(child_folder, folder_path, json_items)
      end repeat
    end tell
  end using terms from
end collect_bookmarks
`;
}

export async function listBookmarks(): Promise<AsideBookmark[]> {
  const response = await execute(String.raw`
${JSON_HELPERS}
${bookmarkWalkerScript()}
${ENSURE_USABLE_WINDOW}
set json_items to {}
using terms from application "Aside"
  tell ${APP_TELL}
    try
      my collect_bookmarks(bookmarks bar, {}, json_items)
    end try
    try
      my collect_bookmarks(other bookmarks, {}, json_items)
    end try
  end tell
end using terms from
set previous_delimiters to AppleScript's text item delimiters
set AppleScript's text item delimiters to ","
set json_output to json_items as text
set AppleScript's text item delimiters to previous_delimiters
return "[" & json_output & "]"
`);

  return parseJsonResponse<AsideBookmark[]>(response, "bookmark list");
}

async function mutateTab(
  tab: Pick<AsideTab, "id" | "windowId">,
  action: "focus" | "close" | "reload" | "get-url",
): Promise<BrowserMutationResult> {
  const tabId = appleScriptString(tab.id);
  const windowId = appleScriptString(tab.windowId);
  const actionScript = {
    focus: "set active tab index of browser_window to tab_index\nset index of browser_window to 1\nactivate",
    close: "close browser_tab",
    reload: "reload browser_tab",
    "get-url": "set result_url to URL of browser_tab",
  }[action];

  const response = await execute(String.raw`
${JSON_HELPERS}
${ENSURE_USABLE_WINDOW}
set result_url to ""
using terms from application "Aside"
  tell ${APP_TELL}
    repeat with browser_window in every window
      if (id of browser_window as text) is "${windowId}" then
        set tab_index to 0
        repeat with browser_tab in every tab of browser_window
          set tab_index to tab_index + 1
          if (id of browser_tab as text) is "${tabId}" then
            ${actionScript}
            return "{\"ok\":true,\"tabId\":" & my json_string("${tabId}") & ",\"windowId\":" & my json_string("${windowId}") & ",\"url\":" & my json_string(result_url) & "}"
          end if
        end repeat
      end if
    end repeat
  end tell
end using terms from
error "ASIDE_STALE_TAB" number 2001
`);

  return parseJsonResponse<BrowserMutationResult>(response, `${action} result`);
}

export function focusTab(tab: Pick<AsideTab, "id" | "windowId">) {
  return mutateTab(tab, "focus");
}

export function closeTab(tab: Pick<AsideTab, "id" | "windowId">) {
  return mutateTab(tab, "close");
}

export function reloadTab(tab: Pick<AsideTab, "id" | "windowId">) {
  return mutateTab(tab, "reload");
}

export function getTabUrl(tab: Pick<AsideTab, "id" | "windowId">) {
  return mutateTab(tab, "get-url");
}

export async function createTab(url?: string): Promise<BrowserMutationResult> {
  const properties = url ? ` with properties {URL:"${appleScriptString(url)}"}` : "";
  const response = await execute(String.raw`
${JSON_HELPERS}
${ENSURE_USABLE_WINDOW}
using terms from application "Aside"
  tell ${APP_TELL}
    set browser_tab to make new tab at end of tabs of front window${properties}
    activate
    return "{\"ok\":true,\"tabId\":" & my json_string(id of browser_tab as text) & ",\"windowId\":" & my json_string(id of front window as text) & "}"
  end tell
end using terms from
`);
  return parseJsonResponse<BrowserMutationResult>(response, "new tab");
}

export async function createWindow(mode: "normal" | "incognito"): Promise<BrowserMutationResult> {
  const response = await execute(String.raw`
${JSON_HELPERS}
using terms from application "Aside"
  tell ${APP_TELL}
    set browser_window to make new window with properties {mode:"${mode}"}
    activate
    return "{\"ok\":true,\"windowId\":" & my json_string(id of browser_window as text) & "}"
  end tell
end using terms from
`);
  return parseJsonResponse<BrowserMutationResult>(response, `new ${mode} window`);
}

export async function getAsideVersion(): Promise<string> {
  return execute(`tell ${APP_TELL} to return version`);
}
