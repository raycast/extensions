import { runAppleScript } from "@raycast/utils";
import { Application, captureException, getApplications, LocalStorage, open } from "@raycast/api";
import { BrowserSetup, Tab } from "../types/types";
import { ARC_BUNDLE_ID, CacheKey, TEST_URL, unsupportedBrowsers } from "./constants";
import { isEmpty } from "./common-utils";
import { recentOnTop } from "../types/preferences";

export const getBrowserSetup = async () => {
  try {
    // get browser applications
    const allOpenUrlApps = await getApplications(TEST_URL);
    const browsers = allOpenUrlApps.filter(
      (browser) => !unsupportedBrowsers.some((unsupported) => browser.name.includes(unsupported)) && browser.bundleId,
    );
    // get setup
    const localStorage = await LocalStorage.getItem<string>(CacheKey.BrowserSetup);
    if (!localStorage) {
      return browsers.map((browser) => {
        return {
          browser: browser,
          isChecked: true,
        };
      });
    } else {
      const browserSetup = JSON.parse(localStorage) as BrowserSetup[];
      return browsers.map((browser) => {
        const setup = browserSetup.find((setup) => setup.browser.path === browser.path);
        return {
          browser: browser,
          isChecked: setup ? setup.isChecked : true,
        };
      });
    }
  } catch (e) {
    captureException(e);
    console.error("Error fetching browsers");
  }
  return [];
};

const scriptJumpToWebkitTab = (browser: string, tab: Tab) => `
tell application "${browser}"
    activate
    set _wnd to first window where id is ${tab.windowId}
    set index of _wnd to 1
    set current tab of _wnd to tab ${tab.tabId} of _wnd
end tell
`;
const scriptJumpToChromeTab = (browser: string, tab: Tab) => `
tell application "${browser}"
  activate
  set _wnd to first window where id is ${tab.windowId}
  set index of _wnd to 1
  set active tab index of _wnd to ${tab.tabId}
end tell
`;

const jumpToWebkitTab = async (browser: string, tab: Tab) => {
  try {
    return await runAppleScript(scriptJumpToWebkitTab(browser, tab));
  } catch (e) {
    console.error(`Error jumpToWebkitTab for ${browser}`);
    return String(e);
  }
};

const jumpToChromeTab = async (browser: string, tab: Tab) => {
  try {
    return await runAppleScript(scriptJumpToChromeTab(browser, tab));
  } catch (e) {
    console.error(`Error jumpToChromeTab for ${browser}`);
    return String(e);
  }
};

export const jumpToBrowserTab = async (browser: Application, tab: Tab) => {
  if (browser.bundleId === ARC_BUNDLE_ID) {
    return await runAppleScriptOnArcTab(browser, tab, "select", true);
  } else {
    const webKitRet = await jumpToWebkitTab(browser.name, tab);
    if (isEmpty(webKitRet)) {
      return webKitRet;
    } else {
      const chromiumRet = await jumpToChromeTab(browser.name, tab);
      if (isEmpty(chromiumRet)) {
        return chromiumRet;
      } else {
        return await open(tab.url, browser);
      }
    }
  }
};

function scriptOnArc(browser: Application, tab: Tab, action: string, activate = false) {
  return `
tell application "${browser.name}"
    if (count of windows) is 0 then
        make new window
    end if
    set foundTab to false
    repeat with aTab in every tab of first window
        set currentURL to URL of aTab
        if currentURL is equal to "${tab.url}" then
            set foundTab to true
            tell aTab to ${action}
            exit repeat 
        end if
    end repeat
    if foundTab is false then
        error "Tab not found"
    end if
    if ${activate} then
        activate
    end if
end tell
    `;
}

const runAppleScriptOnArcTab = async (browser: Application, tab: Tab, action: string, activate = false) => {
  try {
    return await runAppleScript(scriptOnArc(browser, tab, action, activate));
  } catch (e) {
    console.error(`Error runAppleScriptOnArcTab for ${browser.name}`);
    return String(e);
  }
};

const scriptCloseTab = (browser: string, tab: Tab) => `
tell application "${browser}"
    set _wnd to first window where id is ${tab.windowId}
    tell _wnd
        set tabList to tabs
        if ${tab.tabId} ≤ (count tabList) then
            close (item ${tab.tabId} of tabList)
        else
            error "Tab index out of range."
        end if
    end tell
end tell
`;

export const closeBrowserTab = async (browser: Application, tab: Tab) => {
  try {
    if (browser.bundleId === ARC_BUNDLE_ID) {
      return await runAppleScriptOnArcTab(browser, tab, "close", false);
    } else {
      return await runAppleScript(scriptCloseTab(browser.name, tab));
    }
  } catch (e) {
    console.error(`Error closeBrowserTab for ${browser.name}`);
    return String(e);
  }
};

const scriptBrowserTabs = (browser: string) => `
tell application "${browser}"
	if running then
		set output to ""
		repeat with aWindow in every window
      set chromiumTabIndex to 0 
			repeat with aTab in every tab of aWindow
        set chromiumTabIndex to chromiumTabIndex + 1
				try
					-- WebKit
					set tabName to name of aTab
				on error
					-- Chromium
					set tabName to title of aTab
				end try
				set tabUrl to URL of aTab
        set windowId to id of aWindow
				try
          -- WebKit
          set tabIndex to index of aTab
        on error
          -- Chromium
          set tabIndex to chromiumTabIndex
        end try
				set tabInfo to tabName & "\n" & tabUrl & "\n" & windowId & "\n" & tabIndex & "\n\n"
				set output to output & tabInfo
			end repeat
		end repeat
		return output
	else
		return ""
	end if
end tell
`;

export const getTabsString = async (browser: string) => {
  try {
    return await runAppleScript(scriptBrowserTabs(browser));
  } catch (e) {
    captureException(e);
    console.error(`Error fetching tabs for ${browser}`);
  }
  return undefined;
};

const parseTabs = (browser: Application, tabs: string): Tab[] => {
  try {
    const tabStrList = tabs.split("\n\n").filter((tab) => tab.length > 0);
    const tabList = tabStrList.map((tabStr) => {
      const [title, url, windowId, tabId] = tabStr.split("\n");
      const domain = new URL(url).hostname;
      return { browser: browser.name, title, url, domain, windowId, tabId };
    });
    return recentOnTop ? tabList.reverse() : tabList;
  } catch (e) {
    captureException(e);
    console.error("Error parsing tabs");
  }
  return [];
};

export const getBrowsersTabs = async () => {
  try {
    const browserSetup = await getBrowserSetup();
    const browsers = browserSetup.filter((setup) => setup.isChecked).map((setup) => setup.browser);

    const tabsResultsPromises = browsers.map(async (browser) => {
      const tabsString = await getTabsString(browser.name);
      if (tabsString) {
        return {
          browser,
          tabs: parseTabs(browser, tabsString),
        };
      }
      return null;
    });

    const tabsResults = await Promise.all(tabsResultsPromises);

    return tabsResults.filter((result) => result !== null);
  } catch (error) {
    captureException(error);
    console.error("Error fetching browser tabs");
    return [];
  }
};
