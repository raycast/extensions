import { runAppleScript } from "run-applescript";
import { LocalStorage, popToRoot } from "@raycast/api";
import { SettingsProfileOpenBehaviour, Tab, ChromeWindow } from "../interfaces";
import { NOT_INSTALLED_MESSAGE, TAB_NOT_FOUND_MESSAGE } from "../constants";
import { runAppleScript as runAppleScriptRaycast, showFailureToast } from "@raycast/utils";

export async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  const sep = Tab.TAB_CONTENTS_SEPARATOR;
  // Extracting the page favicon requires running JS in each tab, which is inherently one Apple Event per tab.
  const faviconStatement = useOriginalFavicon
    ? `try
            tell application "Google Chrome" to set _favicon to execute tab j of window id _raw_id javascript ¬
              "document.head.querySelector('link[rel~=icon]') ? document.head.querySelector('link[rel~=icon]').href : '';"
          end try
          if _favicon is missing value then set _favicon to ""`
    : "";

  await checkAppInstalled();

  try {
    // Fetch window ids, titles, URLs and tab ids in bulk (4 Apple Events total) instead of 2+ events per tab,
    // then build the output locally with a list + text item delimiters instead of repeated string concatenation.
    const openTabs = await runAppleScript(`
      tell application "Google Chrome"
        set _ids to id of every window
        set _titles to title of every tab of every window
        set _urls to URL of every tab of every window
        set _tab_ids to id of every tab of every window
      end tell

      set _lines to {}
      repeat with i from 1 to count of _ids
        set _raw_id to item i of _ids
        set _w_id to _raw_id as inches as string
        set _w_titles to item i of _titles
        set _w_urls to item i of _urls
        set _w_tab_ids to item i of _tab_ids
        repeat with j from 1 to count of _w_titles
          set _favicon to ""
          ${faviconStatement}
          set end of _lines to (item j of _w_titles) & "${sep}" & (item j of _w_urls) & "${sep}" & _favicon & "${sep}" & _w_id & "${sep}" & j & "${sep}" & ((item j of _w_tab_ids) as inches as string)
        end repeat
      end repeat

      set AppleScript's text item delimiters to linefeed
      set _output to _lines as text
      set AppleScript's text item delimiters to ""
      return _output
  `);

    return openTabs
      .split("\n")
      .filter((line) => line.length !== 0)
      .map((line) => Tab.parse(line));
  } catch (err) {
    if ((err as Error).message.includes('Can\'t get application "Google Chrome"')) {
      LocalStorage.removeItem("is-installed");
    }
    await checkAppInstalled();
    return [];
  }
}

export async function openNewTab({
  url,
  query,
  profileCurrent,
  profileOriginal,
  openTabInProfile,
}: {
  url?: string;
  query?: string;
  profileCurrent: string;
  profileOriginal?: string;
  openTabInProfile: SettingsProfileOpenBehaviour;
}): Promise<boolean | string> {
  await checkAppInstalled();

  let script = "";

  const getOpenInProfileCommand = (profile: string) =>
    `
    set profile to quoted form of "${profile}"
    set link to quoted form of "${url ? url : "about:blank"}"
    do shell script "open -na 'Google Chrome' --args --profile-directory=" & profile & " " & link
  `;

  switch (openTabInProfile) {
    case SettingsProfileOpenBehaviour.Default:
      script =
        `
        set winExists to false
        tell application "Google Chrome"
            repeat with win in every window
                if index of win is 1 then
                    set winExists to true
                    exit repeat
                end if
            end repeat

            if not winExists then
                make new window
            else
                activate
            end if

            tell window 1
                set newTab to make new tab ` +
        (url
          ? `with properties {URL:"${url}"}`
          : query
            ? 'with properties {URL:"https://www.google.com/search?q=' + query + '"}'
            : "") +
        `
            end tell
        end tell
        return true

  `;
      break;
    case SettingsProfileOpenBehaviour.ProfileCurrent:
      script = getOpenInProfileCommand(profileCurrent);
      break;
    case SettingsProfileOpenBehaviour.ProfileOriginal:
      script = getOpenInProfileCommand(profileOriginal!);
      break;
  }

  try {
    await runAppleScriptRaycast(script);
    await popToRoot({ clearSearchBar: true });
    return true;
  } catch (error) {
    await showFailureToast(error);
    return false;
  }
}

/**
 * AppleScript (to run inside `tell application "Google Chrome"`) that finds the tab by its stable id and sets
 * `_wnd` to its window and `_t_index` to its current position. A cached Tab's windowsId/tabIndex can be stale
 * (the list stays mounted after the main window closes), so positions are resolved right before acting.
 */
function locateTabScript(tab: Tab): string {
  return `
      set _w_id to missing value
      set _t_index to 0
      repeat with _w in windows
        set _ids to id of every tab of _w
        repeat with j from 1 to count of _ids
          -- Compare with the same coercion getOpenTabs used, so integer, real and text ids all match
          if ((item j of _ids) as inches as string) is "${tab.tabId.replace(/[^0-9A-Za-z.+-]/g, "")}" then
            set _w_id to id of _w
            set _t_index to j
            exit repeat
          end if
        end repeat
        if _t_index > 0 then exit repeat
      end repeat
      if _t_index is 0 then error "${TAB_NOT_FOUND_MESSAGE}"
      set _wnd to first window where id is _w_id
  `;
}

async function runTabScript(tab: Tab, body: string): Promise<void> {
  try {
    await runAppleScript(`
    tell application "Google Chrome"
      ${locateTabScript(tab)}
      ${body}
    end tell
    return true
  `);
  } catch (err) {
    if (err instanceof Error && err.message.includes(TAB_NOT_FOUND_MESSAGE)) {
      throw new Error(TAB_NOT_FOUND_MESSAGE);
    }
    throw err;
  }
}

export async function setActiveTab(tab: Tab): Promise<void> {
  await runTabScript(
    tab,
    `
      activate
      set index of _wnd to 1
      set active tab index of _wnd to _t_index
  `,
  );
}

export async function closeActiveTab(tab: Tab): Promise<void> {
  await runTabScript(
    tab,
    `
      activate
      set index of _wnd to 1
      set active tab index of _wnd to _t_index
      close active tab of _wnd
  `,
  );
}

export async function reloadTab(tab: Tab): Promise<void> {
  await runTabScript(
    tab,
    `
      activate
      set index of _wnd to 1
      set active tab index of _wnd to _t_index
      tell active tab of _wnd to reload
  `,
  );
}

const checkAppInstalled = async () => {
  const installed = await LocalStorage.getItem("is-installed");
  if (installed) return;

  const appInstalled = await runAppleScript(`
set isInstalled to false
try
    do shell script "osascript -e 'exists application \\"Google Chrome\\"'"
    set isInstalled to true
end try

return isInstalled`);
  if (appInstalled === "false") {
    throw new Error(NOT_INSTALLED_MESSAGE);
  }
  LocalStorage.setItem("is-installed", true);
};

export async function createNewWindow(): Promise<void> {
  await runAppleScript(`
    tell application "Google Chrome"
      make new window
      activate
    end tell
    return true
  `);
}

export async function createNewWindowToWebsie(website: string): Promise<void> {
  await runAppleScript(`
    tell application "Google Chrome"
      make new window
      open location "${website}"
      activate
    end tell
    return true
  `);
}

export async function createNewTab(): Promise<void> {
  await runAppleScript(`
    tell application "Google Chrome"
      make new tab at end of tabs of window 1
      activate
    end tell
    return true
  `);
}

export async function createNewTabToWebsite(website: string): Promise<void> {
  await runAppleScript(`
    tell application "Google Chrome"
      activate
      open location "${website}"
    end tell
    return true
  `);
}

export async function createNewIncognitoWindow(): Promise<void> {
  await runAppleScript(`
    tell application "Google Chrome"
      make new window with properties {mode:"incognito"}
      activate
    end tell
    return true
  `);
}

export async function createNewGuestWindow(): Promise<void> {
  // Use `open` with --args --guest to ensure guest mode even when AppleScript doesn't support it.
  await checkAppInstalled();

  await runAppleScript(`
    do shell script "open -na 'Google Chrome' --args --guest"
  `);
}

export async function createNewGuestWindowToWebsite(website: string): Promise<void> {
  await checkAppInstalled();
  await runAppleScript(`
    set link to quoted form of "${website}"
    do shell script "open -na 'Google Chrome' --args --guest " & link
  `);
}

export async function nameCurrentWindow(): Promise<void> {
  await checkAppInstalled();
  await runAppleScript(`
    tell application "Google Chrome" to activate
    tell application "System Events"
      tell process "Google Chrome"
        click menu item "Name Window…" of menu "Window" of menu bar 1
      end tell
    end tell
  `);
}

export async function getActiveTabURL(): Promise<string> {
  await checkAppInstalled();

  const url = await runAppleScript(`
    tell application "Google Chrome"
      try
        return URL of active tab of front window
      on error
        return ""
      end try
    end tell
  `);

  return url;
}

export async function getOpenWindows(): Promise<ChromeWindow[]> {
  await checkAppInstalled();
  try {
    const openWindows = await runAppleScript(`
      set _rec_sep to character id ${ChromeWindow.WINDOW_RECORD_SEPARATOR.charCodeAt(0)}
      set _field_sep to character id ${ChromeWindow.WINDOW_FIELD_SEPARATOR.charCodeAt(0)}
      set _output to ""
      
      tell application "Google Chrome"
        -- 1. Bulk fetch properties into parallel lists
        set _ids to id of windows
        set _titles to title of windows
        
        set _urls to {}
        try
          set _urls to URL of active tab of windows
        end try
        
        -- 2. Iterate using a shared index (i)
        repeat with i from 1 to length of _ids
          set _w_id to item i of _ids
          set _title to item i of _titles
          
          set _url to ""
          try
            set _url to item i of _urls
          end try
          
          set _output to _output & _w_id & _field_sep & _title & _field_sep & _url & _rec_sep
        end repeat
      end tell
      
      return _output
    `);

    return openWindows
      .split(ChromeWindow.WINDOW_RECORD_SEPARATOR)
      .filter((line) => line.length !== 0)
      .map((line) => ChromeWindow.parse(line));
  } catch (err) {
    if ((err as Error).message.includes('Can\'t get application "Google Chrome"')) {
      LocalStorage.removeItem("is-installed");
    }
    await checkAppInstalled();
    throw err;
  }
}

export async function setActiveWindow(windowId: number): Promise<void> {
  await runAppleScript(`
    tell application "Google Chrome"
      set _wnd to first window where id is ${windowId}
      set index of _wnd to 1
      activate
    end tell
    return true
  `);
}
