import { runAppleScript } from "@raycast/utils";
import { closeMainWindow, popToRoot } from "@raycast/api";
import { Tab } from "../interfaces";
import { NOT_INSTALLED_MESSAGE } from "../constants";

export async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  const faviconFormula = useOriginalFavicon
    ? `execute of tab _tab_index of window _window_index javascript ¬
                    "document.head.querySelector('link[rel~=icon]').href;"`
    : '""';

  await checkAppInstalled();

  const openTabs = await runAppleScript(`
      set _output to ""
      tell application "Opera"
        set _window_index to 1
        repeat with w in windows
          set _tab_index to 1
          repeat with t in tabs of w
            set _title to get title of t
            set _url to get URL of t
            set _favicon to ${faviconFormula}
            set _output to (_output & _title & "${Tab.TAB_CONTENTS_SEPARATOR}" & _url & "${Tab.TAB_CONTENTS_SEPARATOR}" & _favicon & "${Tab.TAB_CONTENTS_SEPARATOR}" & _window_index & "${Tab.TAB_CONTENTS_SEPARATOR}" & _tab_index & "\\n")
            set _tab_index to _tab_index + 1
          end repeat
          set _window_index to _window_index + 1
          if _window_index > count windows then exit repeat
        end repeat
      end tell
      return _output
  `);

  return openTabs
    .split("\n")
    .filter((line) => line.length !== 0)
    .map((line) => Tab.parse(line));
}

export async function openNewTab(queryText: string | null | undefined): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script =
    `
    tell application "Opera"
      activate
      tell window 1
          set newTab to make new tab ` +
    (queryText ? 'with properties {URL:"https://www.google.com/search?q=' + queryText + '"}' : "") +
    ` 
      end tell
    end tell
    return true
  `;
  await checkAppInstalled();

  return await runAppleScript(script);
}

export async function openNewHistoryTab(url: string): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script = `
    tell application "Opera"
      activate
      tell window 1
          set newTab to make new tab with properties {URL:"${url}"}
      end tell
    end tell
    return true
  `;

  return await runAppleScript(script);
}

export async function setActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Opera"
      activate
      set index of window (${tab.windowsIndex} as number) to (${tab.windowsIndex} as number)
      set active tab index of window (${tab.windowsIndex} as number) to (${tab.tabIndex} as number)
    end tell
    return true
  `);
}

const checkAppInstalled = async () => {
  const appInstalled = await runAppleScript(`
set isInstalled to false
try
    do shell script "osascript -e 'exists application \\"Opera\\"'"
    set isInstalled to true
end try

return isInstalled`);
  if (appInstalled === "false") {
    throw new Error(NOT_INSTALLED_MESSAGE);
  }
};
