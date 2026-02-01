import { runAppleScript } from "run-applescript";
import { closeMainWindow, LocalStorage, popToRoot } from "@raycast/api";
import { Tab } from "../interfaces";
import { NOT_INSTALLED_MESSAGE } from "../constants";

export async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  const faviconFormula = useOriginalFavicon
    ? `execute t javascript ¬
        "document.head.querySelector('link[rel~=icon]') ? document.head.querySelector('link[rel~=icon]').href : '';"`
    : '""';

  await checkAppInstalled();

  try {
    const openTabs = await runAppleScript(`
      set _output to ""
      tell application "Comet"
        repeat with w in windows
          set _w_id to get id of w as inches as string
          set _tab_index to 1
          repeat with t in tabs of w
            set _title to get title of t
            set _url to get URL of t
            set _favicon to ${faviconFormula}
            set _output to (_output & _title & "${Tab.TAB_CONTENTS_SEPARATOR}" & _url & "${Tab.TAB_CONTENTS_SEPARATOR}" & _favicon & "${Tab.TAB_CONTENTS_SEPARATOR}" & _w_id & "${Tab.TAB_CONTENTS_SEPARATOR}" & _tab_index & "\\n")
            set _tab_index to _tab_index + 1
          end repeat
        end repeat
      end tell
      return _output
  `);

    return openTabs
      .split("\n")
      .filter((line) => line.length !== 0)
      .map((line) => Tab.parse(line));
  } catch (err) {
    if ((err as Error).message.includes('Can\'t get application "Comet"')) {
      LocalStorage.removeItem("is-installed");
    }
    await checkAppInstalled();
    return [];
  }
}

export async function openNewTab({
  url,
  query,
}: {
  url?: string;
  query?: string;
}): Promise<boolean | string> {
  setTimeout(() => {
    popToRoot({ clearSearchBar: true });
  }, 3000);
  await Promise.all([
    closeMainWindow({ clearRootSearch: true }),
    checkAppInstalled(),
  ]);

  const script =
    `
    set winExists to false
    tell application "Comet"
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
        ? 'with properties {URL:"https://www.google.com/search?q=' +
          query +
          '"}'
        : "") +
    `
        end tell
    end tell
    return true
  `;

  return await runAppleScript(script);
}

export async function setActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      activate
      set _wnd to first window where id is ${tab.windowsId}
      set index of _wnd to 1
      set active tab index of _wnd to ${tab.tabIndex}
    end tell
    return true
  `);
}

export async function closeActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      activate
      set _wnd to first window where id is ${tab.windowsId}
      set index of _wnd to 1
      set active tab index of _wnd to ${tab.tabIndex}
      close active tab of _wnd
    end tell
    return true
  `);
}

const checkAppInstalled = async () => {
  const installed = await LocalStorage.getItem("is-installed");
  if (installed) return;

  const appInstalled = await runAppleScript(`
set isInstalled to false
try
    do shell script "osascript -e 'exists application \\"Comet\\"'"
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
    tell application "Comet"
      make new window
      activate
    end tell
    return true
  `);
}

export async function createNewWindowToWebsite(website: string): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      make new window
      open location "${website}"
      activate
    end tell
    return true
  `);
}

export async function createNewTab(): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      make new tab at end of tabs of window 1
      activate
    end tell
    return true
  `);
}

export async function createNewTabToWebsite(website: string): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      activate
      open location "${website}"
    end tell
    return true
  `);
}

export async function createNewIncognitoWindow(): Promise<void> {
  await runAppleScript(`
    tell application "Comet"
      make new window with properties {mode:"incognito"}
      activate
    end tell
    return true
  `);
}
