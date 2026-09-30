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

export async function getCurrentTabContents(type: ContentType) {
  return await runAppleScript(`tell application "${safariAppIdentifier}" to return ${type} of current tab in window 1`);
}

export async function getTabContents(windowId: number, tabIndex: number, type: ContentType) {
  try {
    return await runAppleScript(`
      tell application "${safariAppIdentifier}"
        if (count of windows) >= ${windowId} then
          set targetWindow to window ${windowId}
          if (count of tabs of targetWindow) >= ${tabIndex} then
            set targetTab to tab ${tabIndex} of targetWindow
            return ${type} of targetTab
          else
            return "Error: Tab index out of range"
          end if
        else
          return "Error: Window ID out of range"
        end if
      end tell
    `);
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function closeTab(windowId: number, tabIndex: number) {
  try {
    const result = await runAppleScript(`
      tell application "${safariAppIdentifier}"
        if (count of windows) >= ${windowId} then
          set targetWindow to window ${windowId}
          if (count of tabs of targetWindow) >= ${tabIndex} then
            set targetTab to tab ${tabIndex} of targetWindow
            close targetTab
            return "Tab closed successfully"
          else
            return "Error: Tab index out of range"
          end if
        else
          return "Error: Window ID out of range"
        end if
      end tell
    `);
    return result;
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function closeCurrentTab() {
  try {
    const result = await runAppleScript(`
      tell application "${safariAppIdentifier}"
        close current tab of front window
        return "Current tab closed successfully"
      end tell
    `);
    return result;
  } catch (error) {
    return `Error: ${error}`;
  }
}

export async function getFocusedTab() {
  try {
    const script = `
      tell application "${safariAppIdentifier}"
        set frontWindow to front window
        set currentTab to current tab of frontWindow
        set tabIndex to index of currentTab
        set tabTitle to name of currentTab
        set tabURL to URL of currentTab
        set windowId to id of frontWindow
        
        return windowId & ":::" & tabIndex & ":::" & tabTitle & ":::" & tabURL
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
