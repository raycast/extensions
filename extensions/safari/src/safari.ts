import { runAppleScript } from "@raycast/utils";
import { safariAppIdentifier } from "./utils";
import { LocalTab } from "./types";

export async function getAllTabs() {
  const windowCountScript = `tell application "${safariAppIdentifier}" to return count of windows`;
  const windowCount = parseInt(await runAppleScript(windowCountScript), 10);

  const tabs: LocalTab[] = [];

  // Iterate through each window
  for (let windowIndex = 1; windowIndex <= windowCount; windowIndex++) {
    // Get all tabs in this window in one call
    const windowTabsScript = `
      tell application "${safariAppIdentifier}"
        set tabData to ""
        set windowTabs to tabs of window ${windowIndex}
        repeat with i from 1 to count of windowTabs
          set currentTab to item i of windowTabs
          set tabData to tabData & name of currentTab & ":::" & URL of currentTab
          if i < count of windowTabs then
            set tabData to tabData & "|||"
          end if
        end repeat
        return tabData
      end tell
    `;

    const tabsData = await runAppleScript(windowTabsScript);

    if (tabsData && tabsData.length > 0) {
      // Parse the tab data
      const tabEntries = tabsData.split("|||");

      tabEntries.forEach((tabEntry, index) => {
        const [title, url] = tabEntry.split(":::");
        const tabIndex = index + 1;

        tabs.push({
          uuid: `${windowIndex}-${tabIndex}`,
          title,
          url: url || "",
          window_id: windowIndex,
          index: tabIndex,
          is_local: true,
        });
      });
    }
  }

  return tabs;
}

export async function addToReadingList(url: string) {
  const escapedUrl = encodeURI(url);
  await runAppleScript(`
    tell application "${safariAppIdentifier}"
      add reading list item "${escapedUrl}"
    end tell
  `);
}

export async function getCurrentTabName() {
  return await runAppleScript(`tell application "${safariAppIdentifier}" to return name of current tab in window 1`);
}

export async function getCurrentTabURL() {
  return await runAppleScript(`tell application "${safariAppIdentifier}" to return URL of current tab in window 1`);
}

export type ContentType = "text" | "source";

export type TabContents = {
  windowId: number;
  index: number;
  title: string;
  url: string;
  /** document.readyState, or "unknown" when Safari does not allow JavaScript from Apple Events */
  readyState: string;
  /** Length of the full content, before truncation */
  length: number;
  content: string;
};

const FIELD_SEPARATOR = String.fromCharCode(30);

// Reads the tab's text or source, truncated inside AppleScript so huge pages never cross the bridge
export async function readTabContents(
  tab: { windowId: number; index: number } | undefined,
  type: ContentType,
  maxLength: number,
): Promise<TabContents> {
  if (tab && (!Number.isInteger(tab.windowId) || tab.windowId < 1 || !Number.isInteger(tab.index) || tab.index < 1)) {
    throw new Error("windowId and index must be whole numbers starting at 1. Use get-all-tabs to list the open tabs.");
  }
  const locateTab = tab
    ? `
      if (count of windows) < ${tab.windowId} then return "missing-window" & sep & (count of windows)
      set targetWindow to window ${tab.windowId}
      if (count of tabs of targetWindow) < ${tab.index} then return "missing-tab" & sep & (count of tabs of targetWindow)
      set targetTab to tab ${tab.index} of targetWindow`
    : `
      if (count of windows) = 0 then return "missing-window" & sep & 0
      set targetWindow to window 1
      set targetTab to current tab of targetWindow`;

  const result = await runAppleScript(`
    tell application "${safariAppIdentifier}"
      set sep to character id 30
      ${locateTab}
      set tabTitle to name of targetTab
      if tabTitle is missing value then set tabTitle to ""
      set tabURL to URL of targetTab
      if tabURL is missing value then set tabURL to ""
      -- Needs "Allow JavaScript from Apple Events", which is off by default
      set readyState to "unknown"
      try
        set readyState to do JavaScript "document.readyState" in targetTab
      end try
      set pageContent to ${type} of targetTab
      if pageContent is missing value then set pageContent to ""
      set contentLength to length of pageContent
      if contentLength > ${maxLength} then set pageContent to text 1 thru ${maxLength} of pageContent
      return "ok" & sep & (index of targetWindow) & sep & (index of targetTab) & sep & readyState & sep & contentLength & sep & tabTitle & sep & tabURL & sep & pageContent
    end tell
  `);

  const [status, ...fields] = result.split(FIELD_SEPARATOR);
  if (status === "missing-window") {
    throw new Error(
      `Safari has no window ${tab?.windowId ?? 1} (${fields[0]} open). Use get-all-tabs to list the open tabs.`,
    );
  }
  if (status === "missing-tab") {
    throw new Error(
      `Safari window ${tab?.windowId} has no tab ${tab?.index} (${fields[0]} open). Use get-all-tabs to list the open tabs.`,
    );
  }
  if (status !== "ok") {
    throw new Error(`Unexpected response from Safari: ${result.slice(0, 200)}`);
  }

  const [windowId, index, readyState, length, title, url, ...content] = fields;
  return {
    windowId: Number(windowId),
    index: Number(index),
    title,
    url,
    readyState,
    length: Number(length),
    // The content itself may contain the separator
    content: content.join(FIELD_SEPARATOR),
  };
}

// Returns the tab's title and URL, or why it does not exist, as "status:::a:::b"
const describeTabScript = (windowId: number, tabIndex: number) => `
  if (count of windows) < ${windowId} then return "missing-window:::" & (count of windows)
  set targetWindow to window ${windowId}
  if (count of tabs of targetWindow) < ${tabIndex} then return "missing-tab:::" & (count of tabs of targetWindow)
  set targetTab to tab ${tabIndex} of targetWindow
  set tabTitle to name of targetTab
  if tabTitle is missing value then set tabTitle to ""
  set tabURL to URL of targetTab
  if tabURL is missing value then set tabURL to ""
`;

function assertTabPosition(windowId: number, tabIndex: number) {
  if (!Number.isInteger(windowId) || windowId < 1 || !Number.isInteger(tabIndex) || tabIndex < 1) {
    throw new Error("windowId and index must be whole numbers starting at 1. Use get-all-tabs to list the open tabs.");
  }
}

function parseTabResult(result: string, windowId: number, tabIndex: number) {
  const [status, ...values] = result.split(":::");
  if (status === "missing-window") {
    throw new Error(`Safari has no window ${windowId} (${values[0]} open). Use get-all-tabs to list the open tabs.`);
  }
  if (status === "missing-tab") {
    throw new Error(
      `Safari window ${windowId} has no tab ${tabIndex} (${values[0]} open). Use get-all-tabs to list the open tabs.`,
    );
  }
  if (status !== "ok") {
    throw new Error(`Unexpected response from Safari: ${result}`);
  }
  return values;
}

export async function getTab(windowId: number, tabIndex: number): Promise<LocalTab> {
  assertTabPosition(windowId, tabIndex);
  const result = await runAppleScript(`
    tell application "${safariAppIdentifier}"
      ${describeTabScript(windowId, tabIndex)}
      return "ok:::" & tabTitle & ":::" & tabURL
    end tell
  `);
  const [title, url = ""] = parseTabResult(result, windowId, tabIndex);
  return { uuid: `${windowId}-${tabIndex}`, title, url, window_id: windowId, index: tabIndex, is_local: true };
}

// Selecting a tab brings its window to the front, so it becomes window 1
export async function selectTab(windowId: number, tabIndex: number): Promise<LocalTab> {
  assertTabPosition(windowId, tabIndex);
  const result = await runAppleScript(`
    tell application "${safariAppIdentifier}"
      ${describeTabScript(windowId, tabIndex)}
      set current tab of targetWindow to targetTab
      if ${windowId} > 1 then set index of targetWindow to 1
      activate
      set selectedTab to current tab of front window
      if index of selectedTab is not ${tabIndex} then return "not-selected"
      return "ok:::" & tabTitle & ":::" & tabURL
    end tell
  `);
  if (result === "not-selected") {
    throw new Error(`Safari did not switch to tab ${tabIndex} of window ${windowId}.`);
  }
  const [title, url = ""] = parseTabResult(result, windowId, tabIndex);
  return { uuid: `1-${tabIndex}`, title, url, window_id: 1, index: tabIndex, is_local: true };
}

// Closing the last tab of a window closes the window, so check both counts
export async function closeTab(windowId: number, tabIndex: number) {
  assertTabPosition(windowId, tabIndex);
  const result = await runAppleScript(`
    tell application "${safariAppIdentifier}"
      ${describeTabScript(windowId, tabIndex)}
      set windowCount to count of windows
      set tabCount to count of tabs of targetWindow
      close targetTab
      delay 0.2
      if (count of windows) = windowCount then
        if (count of tabs of window ${windowId}) is not (tabCount - 1) then return "not-closed"
      end if
      return "ok:::" & tabTitle & ":::" & tabURL
    end tell
  `);
  if (result === "not-closed") {
    throw new Error(`Safari did not close tab ${tabIndex} of window ${windowId}.`);
  }
  const [title, url = ""] = parseTabResult(result, windowId, tabIndex);
  return { closedTab: { title, url } };
}

export async function closeCurrentTab() {
  const windowCount = parseInt(
    await runAppleScript(`tell application "${safariAppIdentifier}" to return count of windows`),
    10,
  );
  if (!windowCount) {
    throw new Error("Safari has no open window.");
  }
  const tabIndex = parseInt(
    await runAppleScript(`tell application "${safariAppIdentifier}" to return index of current tab of window 1`),
    10,
  );
  return await closeTab(1, tabIndex);
}

export async function getFocusedTab() {
  try {
    const script = `
      tell application "${safariAppIdentifier}"
        set frontWindow to front window
        set currentTab to current tab of frontWindow
        set tabIndex to index of currentTab
        set tabTitle to name of currentTab
        if tabTitle is missing value then set tabTitle to ""
        set tabURL to URL of currentTab
        if tabURL is missing value then set tabURL to ""
        set windowId to index of frontWindow

        -- Start with text so & joins strings instead of building a list
        return (windowId as text) & ":::" & tabIndex & ":::" & tabTitle & ":::" & tabURL
      end tell
    `;

    const result = await runAppleScript(script);

    if (result) {
      const [windowId, index, title, url] = result.split(":::");

      return {
        uuid: `${windowId}-${index}`,
        title,
        url: url || "",
        window_id: parseInt(windowId, 10),
        index: parseInt(index, 10),
        is_local: true,
      };
    }

    throw new Error("Could not get focused tab information");
  } catch (error) {
    throw new Error(`Failed to get focused tab: ${error}`);
  }
}

export async function closeOtherTabs() {
  try {
    const script = `
      tell application "${safariAppIdentifier}"
        tell front window
          set currentTabIndex to index of current tab
          close (every tab whose index is not currentTabIndex)
          return "Other tabs closed successfully"
        end tell
      end tell
    `;

    const result = await runAppleScript(script);
    return result;
  } catch (error) {
    return `Error: ${error}`;
  }
}

// Create before activating to avoid switching to an existing window's Space.
// Retry activation because Safari can drop it while finishing a cold launch.
export async function newWindow() {
  const activationRetries = 10;
  const activationDelaySeconds = 0.2;

  await runAppleScript(`
    tell application "${safariAppIdentifier}"
      make new document
      repeat ${activationRetries} times
        activate
        if frontmost then exit repeat
        delay ${activationDelaySeconds}
      end repeat
      if not frontmost then error "Window created, but ${safariAppIdentifier} did not take focus"
    end tell
  `);
}

// Safari's AppleScript dictionary has no private-window API, so the File ▸ New
// Private Window menu item is driven through System Events, which needs
// Accessibility access. Clicking the item works without Safari being frontmost,
// and creating the window before activating keeps it on the current Space.
// Retry activation because Safari can drop it while finishing a cold launch.
export async function newPrivateWindow() {
  // The script itself may wait up to ~22s (process, menu bar, activation), so
  // the outer timeout must comfortably exceed that budget.
  return await runAppleScript(
    `
    on clickPrivateItem()
      -- AXMenuItemCmdModifiers is a bitmask over the modifiers joined with
      -- Command: 1 = Shift, 2 = Option, 4 = Control. So ⇧⌘N reads as 1.
      set shiftCommandMask to 1

      tell application "System Events"
        tell process "${safariAppIdentifier}"
          -- The File menu is always the 3rd menu bar item
          -- (Apple, Safari, File, Edit, View, History), regardless of locale.
          set fileMenu to menu 1 of menu bar item 3 of menu bar 1

          -- Match by English title, or by the ⇧⌘N key equivalent so the command
          -- still works on a localized system. Never fall back to a menu
          -- position: when private browsing is restricted the item is absent,
          -- and clicking that slot would silently open a non-private window.
          repeat with mi in menu items of fileMenu
            set n to name of mi
            set isPrivateItem to (n is not missing value and n is "New Private Window")
            if not isPrivateItem then
              try
                set cmdChar to value of attribute "AXMenuItemCmdChar" of mi
                set cmdMods to value of attribute "AXMenuItemCmdModifiers" of mi
                set isPrivateItem to (cmdChar is "N" and cmdMods is shiftCommandMask)
              on error
                set isPrivateItem to false
              end try
            end if
            if isPrivateItem then
              if enabled of mi then
                click mi
                return "ok"
              else
                return "disabled"
              end if
            end if
          end repeat

          return "not-found"
        end tell
      end tell
    end clickPrivateItem

    on run
      -- "launch" starts Safari without its initial start-page window, so no
      -- stray regular window is ever left behind.
      tell application "${safariAppIdentifier}" to launch

      tell application "System Events"
        repeat 100 times
          if exists process "${safariAppIdentifier}" then exit repeat
          delay 0.1
        end repeat
        if not (exists process "${safariAppIdentifier}") then error "${safariAppIdentifier} did not launch"

        tell process "${safariAppIdentifier}"
          repeat 100 times
            if exists menu bar 1 then exit repeat
            delay 0.1
          end repeat
          if not (exists menu bar 1) then error "${safariAppIdentifier} launched but its menu bar never appeared"
        end tell
      end tell

      set clickResult to clickPrivateItem()
      if clickResult is not "ok" then return clickResult

      tell application "${safariAppIdentifier}"
        repeat 10 times
          activate
          if frontmost then exit repeat
          delay 0.2
        end repeat
        if not frontmost then error "${safariAppIdentifier} did not take focus"
      end tell

      return "ok"
    end run
  `,
    { timeout: 45000 },
  );
}
