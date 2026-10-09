import { runAppleScript } from "@raycast/utils";
import { safariAppIdentifier } from "./utils";
import { LocalTab } from "./types";
import { TabSnapshot } from "./tab-snapshot";

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

/**
 * A tab resolved once and then acted on exactly. `windowRef` is Safari's window ID, which stays the
 * same while the window is open, unlike `windowId` (the window's position, 1 = front).
 */
export type PinnedTab = {
  windowRef: number;
  windowId: number;
  index: number;
  title: string;
  url: string;
};

export type TabPosition = { windowId: number; index: number };

type JxaResult<T> = ({ status: "ok" } & T) | { status: "missing-window" | "missing-tab" | "changed"; count?: number };

// JXA returns JSON, so titles, URLs and page contents never need a separator
async function runSafariJxa<T>(body: string): Promise<JxaResult<T>> {
  const result = await runAppleScript(
    `(() => {
      const app = Application(${JSON.stringify(safariAppIdentifier)});
      const text = (value) => (typeof value === "string" ? value : "");
      ${body}
    })()`,
    { language: "JavaScript" },
  );
  return JSON.parse(result) as JxaResult<T>;
}

function assertTabPosition(position: TabPosition) {
  const { windowId, index } = position;
  if (!Number.isInteger(windowId) || windowId < 1 || !Number.isInteger(index) || index < 1) {
    throw new Error("windowId and index must be whole numbers starting at 1. Use get-all-tabs to list the open tabs.");
  }
}

function throwIfMissing(result: JxaResult<unknown>, position: TabPosition | undefined) {
  if (result.status === "missing-window") {
    throw new Error(
      position
        ? `Safari has no window ${position.windowId} (${result.count} open). Use get-all-tabs to list the open tabs.`
        : "Safari has no open window.",
    );
  }
  if (result.status === "missing-tab") {
    throw new Error(
      `Safari window ${position?.windowId} has no tab ${position?.index} (${result.count} open). Use get-all-tabs to list the open tabs.`,
    );
  }
}

/** Resolves a tab by position, or the current tab of the front window, once. */
export async function resolveTab(position?: TabPosition): Promise<PinnedTab> {
  if (position) assertTabPosition(position);
  const result = await runSafariJxa<PinnedTab>(`
    const windows = app.windows();
    let win, tab;
    ${
      position
        ? `if (windows.length < ${position.windowId}) return JSON.stringify({ status: "missing-window", count: windows.length });
    win = windows[${position.windowId - 1}];
    const tabs = win.tabs();
    if (tabs.length < ${position.index}) return JSON.stringify({ status: "missing-tab", count: tabs.length });
    tab = tabs[${position.index - 1}];`
        : `if (windows.length === 0) return JSON.stringify({ status: "missing-window", count: 0 });
    win = windows[0];
    tab = win.currentTab();`
    }
    return JSON.stringify({
      status: "ok",
      windowRef: win.id(),
      windowId: win.index(),
      index: tab.index(),
      title: text(tab.name()),
      url: text(tab.url()),
    });
  `);
  throwIfMissing(result, position);
  if (result.status !== "ok") throw new Error(`Unexpected response from Safari: ${result.status}`);
  const { windowRef, windowId, index, title, url } = result;
  return { windowRef, windowId, index, title, url };
}

const tabChangedError = (tab: PinnedTab, action: string) =>
  new Error(
    `The tab "${tab.title || tab.url}" is no longer at position ${tab.index} of its window, or it now shows another page. Nothing was ${action}. Use get-all-tabs to find it again.`,
  );

const appleScriptString = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// Finds the pinned tab by window ID and position, and checks it still shows the same page
const pinnedTabScript = (tab: PinnedTab, { checkTitle }: { checkTitle: boolean }) => `
  if not (exists window id ${tab.windowRef}) then return "changed"
  set targetWindow to window id ${tab.windowRef}
  if (count of tabs of targetWindow) < ${tab.index} then return "changed"
  set targetTab to tab ${tab.index} of targetWindow
  set tabURL to URL of targetTab
  if tabURL is missing value then set tabURL to ""
  set tabTitle to name of targetTab
  if tabTitle is missing value then set tabTitle to ""
  considering case
    if tabURL is not ${appleScriptString(tab.url)} then return "changed"
    ${checkTitle ? `if tabTitle is not ${appleScriptString(tab.title)} then return "changed"` : ""}
  end considering
`;

// Selecting a tab brings its window to the front, so it becomes window 1
export async function selectTab(position: TabPosition): Promise<LocalTab> {
  const tab = await resolveTab(position);
  const result = await runAppleScript(`
    tell application "${safariAppIdentifier}"
      ${pinnedTabScript(tab, { checkTitle: false })}
      set current tab of targetWindow to targetTab
      set index of targetWindow to 1
      activate
      if index of current tab of front window is not ${tab.index} then return "not-selected"
      return "ok"
    end tell
  `);
  if (result === "changed") throw tabChangedError(tab, "selected");
  if (result !== "ok") throw new Error(`Safari did not switch to tab ${tab.index} of window ${tab.windowId}.`);
  return { uuid: `1-${tab.index}`, title: tab.title, url: tab.url, window_id: 1, index: tab.index, is_local: true };
}

// Closing the last tab of a window closes the window, so check both counts
export async function closePinnedTab(tab: PinnedTab) {
  const result = await runAppleScript(`
    tell application "${safariAppIdentifier}"
      ${pinnedTabScript(tab, { checkTitle: true })}
      set tabCount to count of tabs of targetWindow
      close targetTab
      delay 0.2
      if exists window id ${tab.windowRef} then
        if (count of tabs of window id ${tab.windowRef}) is not (tabCount - 1) then return "not-closed"
      end if
      return "ok"
    end tell
  `);
  if (result === "changed") throw tabChangedError(tab, "closed");
  if (result !== "ok") throw new Error(`Safari did not close "${tab.title || tab.url}".`);
  return { closedTab: { title: tab.title, url: tab.url } };
}

export type TabContents = {
  /** The window's position when the content was read, 1 = front */
  windowId: number;
  /** The current title, which can change while the page loads */
  title: string;
  /** document.readyState, or "unknown" when Safari does not allow JavaScript from Apple Events */
  readyState: string;
  /** Length of the full content, before truncation */
  length: number;
  /** Whether the full content, before truncation, has any non-whitespace character */
  hasContent: boolean;
  content: string;
};

/** Reads the pinned tab's text or source, truncated before it leaves osascript. */
export async function readPinnedTabContents(
  tab: PinnedTab,
  type: ContentType,
  maxLength: number,
): Promise<TabContents> {
  const result = await runSafariJxa<TabContents>(`
    const win = app.windows.byId(${tab.windowRef});
    if (!win.exists()) return JSON.stringify({ status: "changed" });
    const tabs = win.tabs();
    if (tabs.length < ${tab.index}) return JSON.stringify({ status: "changed" });
    const tab = tabs[${tab.index - 1}];
    if (text(tab.url()) !== ${JSON.stringify(tab.url)}) return JSON.stringify({ status: "changed" });
    // Needs "Allow JavaScript from Apple Events", which is off by default; a missing value stays "unknown"
    let readyState = "unknown";
    try {
      readyState = text(app.doJavaScript("document.readyState", { in: tab })) || "unknown";
    } catch (error) {}
    const content = text(tab.${type === "text" ? "text" : "source"}());
    return JSON.stringify({
      status: "ok",
      windowId: win.index(),
      title: text(tab.name()),
      readyState,
      length: content.length,
      hasContent: content.trim().length > 0,
      content: content.slice(0, ${maxLength}),
    });
  `);
  if (result.status === "changed") throw tabChangedError(tab, "read");
  if (result.status !== "ok") throw new Error(`Unexpected response from Safari: ${result.status}`);
  const { windowId, title, readyState, length, hasContent, content } = result;
  return { windowId, title, readyState, length, hasContent, content };
}

/** Lists the tabs of each window, to tell exactly which tab a call opened. Throws if Safari can't be read. */
export async function getTabSnapshot(): Promise<TabSnapshot> {
  const result = await runSafariJxa<{ windows: TabSnapshot }>(`
    const windows = [];
    for (const win of app.windows()) {
      let tabs;
      try {
        tabs = win.tabs().map((tab) => ({ title: text(tab.name()), url: text(tab.url()) }));
      } catch (error) {
        continue;
      }
      windows.push({ windowRef: win.id(), windowId: win.index(), tabs });
    }
    return JSON.stringify({ status: "ok", windows });
  `);
  if (result.status !== "ok") throw new Error(`Unexpected response from Safari: ${result.status}`);
  return result.windows;
}

export async function getFocusedTab(): Promise<LocalTab> {
  const tab = await resolveTab();
  return {
    uuid: `${tab.windowId}-${tab.index}`,
    title: tab.title,
    url: tab.url,
    window_id: tab.windowId,
    index: tab.index,
    is_local: true,
  };
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
