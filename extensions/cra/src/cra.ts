import { runAppleScript } from "@raycast/utils";
import { Space, Tab, TabLocation } from "./types";
import { findSpaceInSpaces } from "./utils";

// AppleScript replies are plain text: fields are separated by ASCII US (31), records by ASCII RS (30),
// groups by ASCII GS (29). These never appear in tab titles or URLs, so no JSON escaping is needed.
// Values that come from the user (URLs, space names, ids) are never interpolated into the script text:
// they are passed as `argv` and read with `item N of argv`.
const FIELD = "\x1f";
const RECORD = "\x1e";
const GROUP = "\x1d";

// Properties (not `set`) so that they are visible inside `on run argv` too.
const DELIMITERS = `
  property FS : character id 31
  property RS : character id 30
  property GS : character id 29
`;

/**
 * Ensures Cra is running and has at least one window.
 * When Cra is not running, launching it already creates a window,
 * so we avoid calling `make new window` in that case to prevent duplicates.
 */
async function ensureCraIsRunning() {
  await runAppleScript(`
    if application "Cra" is not running then
      tell application "Cra" to activate
      delay 1
    else
      tell application "Cra"
        if (count of windows) is 0 then
          make new window
        end if
      end tell
    end if
  `);
}

// Prepended to read-only scripts that run in the background: bail out instead of letting
// `tell application "Cra"` launch Cra, and do so inside the script to keep the check-to-use gap minimal.
const SKIP_IF_CRA_IS_CLOSED = `
  if application "Cra" is not running then return ""
  tell application "Cra"
    if (count of windows) is 0 then return ""
  end tell
`;

type ReadOptions = {
  /** When false, never launch Cra or create a window; resolves to undefined if Cra is not ready. */
  launch?: boolean;
};

function parseRecords(response: string | undefined): string[][] {
  if (!response) {
    return [];
  }
  return response
    .split(RECORD)
    .filter((record) => record.length > 0)
    .map((record) => record.split(FIELD));
}

function toTab([title, url, id, location]: string[]): Tab {
  return { title, url, id, location: location as TabLocation };
}

// Joins the AppleScript list `_rows` into one RS-separated string.
const RETURN_ROWS = `
  set AppleScript's text item delimiters to RS
  set _out to _rows as text
  set AppleScript's text item delimiters to ""
  return _out
`;

// Tabs
export async function getTabs({ launch = true }: ReadOptions = {}): Promise<Tab[] | undefined> {
  if (launch) await ensureCraIsRunning();
  const response = await runAppleScript(`
    ${DELIMITERS}
    ${launch ? "" : SKIP_IF_CRA_IS_CLOSED}
    set _rows to {}

    tell application "Cra"
      tell first window
        set _all_tabs to properties of every tab
      end tell
      repeat with i from 1 to count of _all_tabs
        set _tab to item i of _all_tabs
        set end of _rows to (title of _tab) & FS & (URL of _tab) & FS & (id of _tab) & FS & (location of _tab)
      end repeat
    end tell

    ${RETURN_ROWS}
  `);

  // An empty reply means that Cra is not ready (only possible with launch: false).
  return response || launch ? parseRecords(response).map(toTab) : undefined;
}

export async function getTabsWithSpaceInfo(): Promise<Tab[]> {
  await ensureCraIsRunning();
  const response = await runAppleScript(`
    ${DELIMITERS}
    set _rows to {}
    set _space_rows to {}

    tell application "Cra"
      tell first window
        set _all_tabs to properties of every tab
        repeat with i from 1 to count of _all_tabs
          set _tab to item i of _all_tabs
          set end of _rows to (title of _tab) & FS & (URL of _tab) & FS & (id of _tab) & FS & (location of _tab)
        end repeat

        set _space_index to 1
        repeat with _space in spaces
          set _space_title to title of _space
          if _space_title is "" then
            set _space_title to "Space " & _space_index
          end if
          set _space_tab_ids to id of every tab of _space
          repeat with _tab_id in _space_tab_ids
            set end of _space_rows to (_tab_id as text) & FS & _space_title
          end repeat
          set _space_index to _space_index + 1
        end repeat
      end tell
    end tell

    set AppleScript's text item delimiters to RS
    set _out to (_rows as text) & GS & (_space_rows as text)
    set AppleScript's text item delimiters to ""
    return _out
  `);

  const [tabsPart = "", spacesPart = ""] = response.split(GROUP);
  const spaceByTabId = new Map(parseRecords(spacesPart).map(([tabId, spaceName]) => [tabId, spaceName]));
  return parseRecords(tabsPart).map((fields) => ({ ...toTab(fields), spaceName: spaceByTabId.get(fields[2]) }));
}

export async function getFocusedTab(): Promise<(Tab & { spaceId: string }) | undefined> {
  await ensureCraIsRunning();
  const response = await runAppleScript(`
    ${DELIMITERS}
    tell application "Cra"
      tell front window
        -- A window without an active tab (e.g. an empty window) is a normal state, not an error.
        if (count of tabs) is 0 then return ""
        set _tab to properties of active tab
        set _title to title of _tab
        set _url to URL of _tab
        set _id to id of _tab
        set _location to location of _tab

        set _active_space_id to id of active space
        set _space_index to 1
        set _space_title to ""
        repeat with _space in spaces
          if id of _space is equal to _active_space_id then
            set _space_title to title of _space
            exit repeat
          end if
          set _space_index to _space_index + 1
        end repeat
        if _space_title is "" then
          set _space_title to "Space " & _space_index
        end if
      end tell
    end tell

    return _title & FS & _url & FS & _id & FS & _location & FS & _space_index & FS & _space_title
  `);

  const [fields] = parseRecords(response);
  if (!fields) {
    return undefined;
  }
  return { ...toTab(fields), spaceId: fields[4], spaceName: fields[5] };
}

/** Finds the first open tab (in any window) with exactly this URL. */
export async function findTab(url: string): Promise<Tab | undefined> {
  const response = await runAppleScript(
    `
    ${DELIMITERS}
    on run argv
      set _url to item 1 of argv
      tell application "Cra"
        repeat with _window in windows
          set _matches to (tabs of _window whose URL is _url)
          if (count of _matches) > 0 then
            set _tab to item 1 of _matches
            return (title of _tab) & FS & (URL of _tab) & FS & (id of _tab) & FS & (location of _tab)
          end if
        end repeat
      end tell
      return ""
    end run
  `,
    [url],
  );

  const [fields] = parseRecords(response);
  return fields ? toTab(fields) : undefined;
}

type TabAction = "select" | "close" | "reload";

// Errors are not caught here: a tab that no longer exists must reach the caller, so the UI does not report success.
async function runActionOnTab(tabId: string, action: TabAction, activate = false) {
  await ensureCraIsRunning();
  await runAppleScript(
    `
    on run argv
      set _id to item 1 of argv
      tell application "Cra"
        repeat with _window in windows
          set _matches to (tabs of _window whose id is _id)
          if (count of _matches) > 0 then
            tell item 1 of _matches to ${action}
            ${activate ? "activate" : ""}
            return
          end if
        end repeat
      end tell
      error "The tab no longer exists." number 1
    end run
  `,
    [tabId],
  );
}

export async function selectTab(tab: Tab | string) {
  await runActionOnTab(typeof tab === "string" ? tab : tab.id, "select", true);
}

export async function closeTab(tab: Tab | string) {
  await runActionOnTab(typeof tab === "string" ? tab : tab.id, "close");
}

export async function reloadTab(tab: Tab | string) {
  await runActionOnTab(typeof tab === "string" ? tab : tab.id, "reload");
}

export async function makeNewTab(url: string, space?: string) {
  await ensureCraIsRunning();
  await runAppleScript(
    `
    on run argv
      set _url to item 1 of argv
      set _space to item 2 of argv
      tell application "Cra"
        tell front window
          if _space is not "" then tell (first space whose title is _space) to focus
          make new tab with properties {URL:_url}
        end tell

        activate
      end tell
    end run
  `,
    [url, space ?? ""],
  );
}

export async function getValidatedSpaceTitle(spaceId: string | undefined) {
  if (spaceId) {
    const spaces = await getSpaces();
    if (spaces) {
      return findSpaceInSpaces(spaceId, spaces);
    }
  }

  return undefined;
}

// Windows
export type MakeNewWindowOptions = {
  incognito?: boolean;
  url?: string;
  space?: string;
};

export async function makeNewWindow(options: MakeNewWindowOptions = {}): Promise<void> {
  await runAppleScript(
    `
    on run argv
      set _incognito to (item 1 of argv) is "true"
      set _space to item 2 of argv
      set _url to item 3 of argv
      tell application "Cra"
        make new window with properties {incognito:_incognito}
        activate

        if _space is not "" then tell front window to tell (first space whose title is _space) to focus
        if _url is not "" then tell front window to make new tab with properties {URL:_url}
      end tell
    end run
  `,
    [String(options.incognito ?? false), options.space ?? "", options.url ?? ""],
  );
}

// Opens a Little Window, Cra's small floating window for one page. Creating a tab on the
// application itself (not on a window) is how Cra's AppleScript dictionary does this.
export async function makeNewLittleWindow(url: string) {
  await runAppleScript(
    `
    on run argv
      set _url to item 1 of argv
      tell application "Cra"
        make new tab with properties {URL:_url}
        activate
      end tell
    end run
  `,
    [url],
  );
}

// Cra has no scripting command for these, so the menu item is clicked (needs Accessibility access).
// Menu and item names are fixed strings from the code, never user input.
async function clickMenuItem(menu: string, item: string) {
  await ensureCraIsRunning();
  await runAppleScript(
    `
    on run argv
      set _menu to item 1 of argv
      set _item to item 2 of argv
      tell application "Cra" to activate
      delay 0.5
      tell application "System Events"
        tell process "Cra"
          click menu item _item of menu _menu of menu bar 1
        end tell
      end tell
    end run
  `,
    [menu, item],
  );
}

export async function makeNewBlankWindow() {
  await clickMenuItem("File", "Blank Window");
}

export async function makeNewEasel() {
  await clickMenuItem("File", "New Easel");
}

export async function resetSpaceTabs() {
  await clickMenuItem("Tabs", "Reset all tabs in this Space");
}

// Spaces
function spaceIndex(spaceId: string) {
  const index = Number(spaceId);
  if (!Number.isInteger(index) || index < 1) {
    throw new Error(`Invalid space ID: ${spaceId}`);
  }
  return String(index);
}

export async function makeNewTabWithinSpace(url: string, space: Space) {
  await ensureCraIsRunning();
  await runAppleScript(
    `
    on run argv
      set _url to item 1 of argv
      set _index to (item 2 of argv) as integer
      tell application "Cra"
        tell front window
          tell space _index
            make new tab with properties {URL:_url}
          end tell
        end tell

        activate
      end tell
    end run
  `,
    [url, spaceIndex(space.id)],
  );
}

export async function selectSpace(space: Space) {
  await selectSpaceById(space.id);
}

export async function selectSpaceById(spaceId: string) {
  await ensureCraIsRunning();
  await runAppleScript(
    `
    on run argv
      set _index to (item 1 of argv) as integer
      tell application "Cra"
        tell front window
          tell space _index to focus
        end tell

        activate
      end tell
    end run
  `,
    [spaceIndex(spaceId)],
  );
}

export async function getSpaces({ launch = true }: ReadOptions = {}): Promise<Space[] | undefined> {
  if (launch) await ensureCraIsRunning();
  const response = await runAppleScript(`
    ${DELIMITERS}
    ${launch ? "" : SKIP_IF_CRA_IS_CLOSED}
    set _rows to {}

    tell application "Cra"
      set _space_index to 1

      tell front window
        set _active_space_id to id of active space

        repeat with _space in spaces
          set _title to title of _space
          set _is_active to (id of _space is equal to _active_space_id)
          set end of _rows to (_space_index as text) & FS & _title & FS & (_is_active as text)
          set _space_index to _space_index + 1
        end repeat
      end tell
    end tell

    ${RETURN_ROWS}
  `);

  return response || launch
    ? parseRecords(response).map(([id, title, isActive]) => ({ id, title, isActive: isActive === "true" }))
    : undefined;
}

export async function getActiveSpace() {
  const spaces = await getSpaces();
  return spaces?.find((space) => space.isActive);
}

// Utils
export async function getTabsInSpace(spaceId: string): Promise<Tab[]> {
  await ensureCraIsRunning();
  const response = await runAppleScript(
    `
    ${DELIMITERS}
    on run argv
      set _index to (item 1 of argv) as integer
      set _rows to {}

      tell application "Cra"
        tell front window
          set _all_tabs to properties of every tab of space _index
          repeat with i from 1 to count of _all_tabs
            set _tab to item i of _all_tabs
            set end of _rows to (title of _tab) & FS & (URL of _tab) & FS & (id of _tab) & FS & (location of _tab)
          end repeat
        end tell
      end tell

      ${RETURN_ROWS}
    end run
  `,
    [spaceIndex(spaceId)],
  );

  return parseRecords(response).map(toTab);
}
