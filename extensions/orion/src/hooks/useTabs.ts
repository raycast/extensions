import { runAppleScript, useCachedPromise } from "@raycast/utils";

import { Tab } from "../types";
import { executeJxa, getOrionAppIdentifier } from "../utils";

type TabSnapshot = {
  tabs: Tab[];
  needsCurrentTabResolution: boolean;
};

type CurrentTabLocation = {
  windowId: number;
  // Tab indexes in the extension are zero-based; AppleScript exposes them
  // one-based.
  tabIndex: number;
};

// JXA exposes the current tab's URL and title but not its object identity. In
// the common case that pair is unique, it is both fast and sufficient. When
// the pair is duplicated (or a page is briefly in flight), use the scripting
// dictionary's object comparison as a narrow fallback so a duplicate tab is
// never labelled as current by mistake.
async function getCurrentTabLocation(): Promise<CurrentTabLocation | undefined> {
  try {
    const result = await runAppleScript(
      `
        tell application "${getOrionAppIdentifier()}"
          if (count of windows) is 0 then return ""
          set currentWindow to window 1
          set currentTab to current tab of currentWindow
          set tabCount to count of tabs of currentWindow
          repeat with i from 1 to tabCount
            if tab i of currentWindow is currentTab then
              return (id of currentWindow as text) & ":" & (i as text)
            end if
          end repeat
        end tell
        return ""
      `,
      // The locator is a plain string; request the default human-readable
      // output so runAppleScript returns `windowId:tabIndex`, not an escaped
      // AppleScript string literal.
      { language: "AppleScript" },
    );
    // `osascript` may retain its terminating newline in the Raycast utility
    // wrapper. Normalize it before parsing so a valid location is not treated
    // as an absent current tab.
    const match = result.trim().match(/^(\d+):(\d+)$/);
    if (!match) return undefined;

    return { windowId: Number(match[1]), tabIndex: Number(match[2]) - 1 };
  } catch (error) {
    // This fallback runs only for ambiguous current tabs. The fast JXA
    // snapshot remains useful if Orion temporarily declines the request.
    console.log("Could not resolve the exact current Orion tab", error);
    return undefined;
  }
}

async function fetchLocalTabs(): Promise<Tab[]> {
  const res = await executeJxa(`
    const orion = Application("${getOrionAppIdentifier()}");
    const result = { tabs: [], needsCurrentTabResolution: false };
    orion.windows().forEach(window => {
      const windowId = window.id();
      // Orion's scripting bridge fails when reading 'URL'/'name' from the tab
      // objects returned by window.tabs(), but bulk property access on the tab
      // collection (window.tabs.url() / .name()) works, so read them that way.
      let urls, names;
      try {
        urls = window.tabs.url();
        names = window.tabs.name();
      } catch (e) {
        return;
      }
      const count = Math.min(urls.length, names.length);
      let currentUrl = '';
      let currentName = '';
      try {
        const currentTab = window.currentTab();
        currentUrl = currentTab.url() || '';
        currentName = currentTab.name() || '';
      } catch (e) {
        // Keep every tab available even when Orion does not expose its active
        // tab while a page is in flight.
      }

      // A tab has no JXA-exposed persistent identifier. If the current URL and
      // title point to exactly one tab in the frontmost window, we can safely
      // mark it. Otherwise, ask the AppleScript bridge for the exact instance
      // after this fast bulk snapshot is returned.
      const currentMatches = [];
      if (window.index() === 1) {
        for (let i = 0; i < count; i++) {
          if ((urls[i] || '') === currentUrl && (names[i] || '') === currentName) {
            currentMatches.push(i);
          }
        }
      }
      const currentIndex = currentMatches.length === 1 ? currentMatches[0] : -1;
      if (window.index() === 1 && currentIndex === -1) {
        result.needsCurrentTabResolution = true;
      }

      for (let i = 0; i < count; i++) {
        const url = urls[i] || '';
        result.tabs.push({
          title: names[i],
          url: url,
          window_id: windowId,
          tab_index: i,
          is_current: i === currentIndex,
        });
      }
    });
    result
  `);
  if (!res) return [];

  const snapshot = JSON.parse(res) as TabSnapshot;
  if (!snapshot.needsCurrentTabResolution) return snapshot.tabs;

  const currentTab = await getCurrentTabLocation();
  if (!currentTab) return snapshot.tabs;

  return snapshot.tabs.map((tab) => ({
    ...tab,
    is_current: tab.window_id === currentTab.windowId && tab.tab_index === currentTab.tabIndex,
  }));
}

const useLocalTabs = () => useCachedPromise(fetchLocalTabs, [], { keepPreviousData: true });

const useTabs = () => {
  const tabs = useLocalTabs();
  return { tabs: tabs.data, refresh: tabs.revalidate };
};

export default useTabs;
