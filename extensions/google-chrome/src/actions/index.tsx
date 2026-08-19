import { runAppleScript } from "run-applescript";
import { LocalStorage, popToRoot } from "@raycast/api";
import { SettingsProfileOpenBehaviour, Tab, ChromeWindow } from "../interfaces";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { runAppleScript as runAppleScriptRaycast, showFailureToast } from "@raycast/utils";

export async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  // `properties of tabs` returns every tab's title, URL and id for a whole window in
  // a single Apple Event, instead of two round-trips per tab. Reading the three
  // attributes as separate lists would be a similar win, but they would be separate
  // snapshots: a tab opened or closed in between shifts one list against the others
  // and a row would end up carrying another tab's id. The favicon still needs one
  // event per tab, so it is only evaluated when the preference is on. That event
  // addresses the tab by id rather than by position, so it cannot pick up a
  // different tab's icon if the window changed since the snapshot, and it is
  // wrapped in a `try` so one unreachable tab cannot abort the whole listing.
  const faviconStatement = useOriginalFavicon
    ? `set _favicon to ""
            try
              set _favicon to execute (first tab of w whose id is (id of _p)) javascript ¬
                "document.head.querySelector('link[rel~=icon]') ? document.head.querySelector('link[rel~=icon]').href : '';"
            end try`
    : `set _favicon to ""`;

  await checkAppInstalled();

  try {
    const openTabs = await runAppleScript(`
      set _field_sep to character id ${Tab.TAB_CONTENTS_SEPARATOR.charCodeAt(0)}
      set _rec_sep to character id ${Tab.TAB_RECORD_SEPARATOR.charCodeAt(0)}
      set _output to ""
      tell application "Google Chrome"
        repeat with w in windows
          set _w_id to get id of w as inches as string
          set _props to properties of tabs of w
          repeat with i from 1 to count of _props
            set _p to item i of _props
            ${faviconStatement}
            set _output to (_output & (title of _p) & _field_sep & (URL of _p) & _field_sep & _favicon & _field_sep & _w_id & _field_sep & i & _field_sep & (id of _p) & _rec_sep)
          end repeat
        end repeat
      end tell
      return _output
  `);

    return (
      openTabs
        .split(Tab.TAB_RECORD_SEPARATOR)
        // Anything without a field separator is not a record — notably the trailing
        // newline osascript appends, which is not empty and would otherwise parse
        // into a tab with no url and no id.
        .filter((line) => line.includes(Tab.TAB_CONTENTS_SEPARATOR))
        .map((line) => Tab.parse(line))
    );
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

// The actions below address tabs by Chrome's own tab id rather than by position,
// and scan every window rather than only the one the tab was listed in: a listed
// tab's position is valid only for the instant it was read, and the tab may since
// have been reordered, or moved to another window entirely. Acting on a stale
// position means activating the wrong tab — or, for `closeActiveTab`, closing it.
//
// `close` and `reload` act on a tab reference resolved by Chrome, so no positional
// index is involved at any point. `setActiveTab` has to go through
// `active tab index`, the only activation Chrome exposes, so it consumes the index
// in the very iteration that produced it and re-derives it on every attempt.

// Defence in depth: `tabId` is the only field interpolated into these scripts, so
// it is checked to be what Chrome actually returns — digits — rather than trusted
// because the delimiters should have kept page-controlled text out of it.
const tabIdForScript = (tabId: string) => {
  if (!/^\d+$/.test(tabId)) {
    throw new Error(`Unexpected Chrome tab id: ${JSON.stringify(tabId)}`);
  }
  return tabId;
};

const actOnTabById = (tabId: string, action: string) => `
      repeat with w in windows
        set _matches to (every tab of w whose id is "${tabIdForScript(tabId)}")
        if (count of _matches) = 0 then
          -- Chrome reports ids as text, but match numerically as well so a build
          -- that hands them back as numbers still resolves. Safe to interpolate
          -- unquoted: the id has been validated to be digits.
          set _matches to (every tab of w whose id is ${tabIdForScript(tabId)})
        end if
        if (count of _matches) > 0 then
          set _t to item 1 of _matches
          set index of w to 1
          ${action}
          return true
        end if
      end repeat
      error "Tab not found"`;

export async function setActiveTab(tab: Tab): Promise<void> {
  // `as text` because Chrome reports ids as text; the cast keeps the comparison
  // working if a build ever hands back numbers instead.
  await runAppleScript(`
    tell application "Google Chrome"
      activate
      repeat 3 times
        set _seen to false
        repeat with w in windows
          set _tab_ids to id of tabs of w
          repeat with i from 1 to count of _tab_ids
            if (item i of _tab_ids as text) is "${tabIdForScript(tab.tabId)}" then
              set _seen to true
              set index of w to 1
              set active tab index of w to i
              -- Confirm the index still resolved to the intended tab. If the list
              -- shifted in between, retry from a fresh scan rather than leaving a
              -- different tab activated.
              if (id of active tab of w as text) is "${tabIdForScript(tab.tabId)}" then return true
              exit repeat
            end if
          end repeat
          if _seen then exit repeat
        end repeat
        if not _seen then exit repeat
      end repeat
      error "Tab not found"
    end tell
  `);
}

export async function closeActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Google Chrome"
      activate
      ${actOnTabById(tab.tabId, "close _t")}
    end tell
  `);
}

export async function reloadTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Google Chrome"
      activate
      ${actOnTabById(tab.tabId, "tell _t to reload")}
    end tell
  `);
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
