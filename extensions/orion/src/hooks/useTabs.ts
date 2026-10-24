import { useCallback, useEffect, useRef } from "react";
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

// Returns `undefined` when the underlying JXA call itself failed (Orion quit,
// or briefly declined the request), as distinct from a successful call that
// legitimately found zero tabs. Callers that poll in the background need
// that distinction so a transient failure doesn't wipe a known-good snapshot.
async function fetchLocalTabsRaw(options?: { silent?: boolean }): Promise<Tab[] | undefined> {
  const res = await executeJxa(
    `
    const orion = Application("${getOrionAppIdentifier()}");
    const result = { tabs: [], needsCurrentTabResolution: false };
    // \`orion.running()\` never launches the app - unlike any property or
    // method that actually talks to it (e.g. \`.windows()\`), which macOS
    // launches the target application for if it isn't already running. A
    // background poll must never bring back an application the user just
    // quit, so this has to be checked before touching anything else on it.
    if (orion.running()) {
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
    }
    result
  `,
    options,
  );
  if (!res) return undefined;

  const snapshot = JSON.parse(res) as TabSnapshot;
  if (!snapshot.needsCurrentTabResolution) return snapshot.tabs;

  const currentTab = await getCurrentTabLocation();
  if (!currentTab) return snapshot.tabs;

  return snapshot.tabs.map((tab) => ({
    ...tab,
    is_current: tab.window_id === currentTab.windowId && tab.tab_index === currentTab.tabIndex,
  }));
}

async function fetchLocalTabs(): Promise<Tab[]> {
  return (await fetchLocalTabsRaw()) ?? [];
}

const COMMAND_BAR_REFRESH_INTERVAL_MS = 1000;

type UseTabsOptions = {
  refreshWhileOpen?: boolean;
};

function tabsAreEqual(current: Tab[] | undefined, next: Tab[]): boolean {
  return (
    current !== undefined &&
    current.length === next.length &&
    current.every(
      (tab, index) =>
        tab.window_id === next[index].window_id &&
        tab.url === next[index].url &&
        tab.title === next[index].title &&
        tab.tab_index === next[index].tab_index &&
        tab.is_current === next[index].is_current,
    )
  );
}

const useLocalTabs = ({ refreshWhileOpen = false }: UseTabsOptions = {}) => {
  const tabs = useCachedPromise(fetchLocalTabs, [], { keepPreviousData: true });
  const pollInFlight = useRef(false);
  const latestTabsRef = useRef<Tab[] | undefined>(undefined);
  // Bumped by every authoritative local write (currently just markTabActive).
  // A poll captures this at the start of its JXA round trip; if it has moved
  // by the time the poll resolves, a more recent local change already
  // superseded whatever the poll saw, so that stale result must be discarded.
  const mutationVersionRef = useRef(0);

  useEffect(() => {
    latestTabsRef.current = tabs.data;
  }, [tabs.data]);

  // Background-poll only: silent (no failure toast) and applied only when it
  // still reflects reality (deduped against the last snapshot, discarded if
  // superseded by a newer local write). User-triggered refreshes - the
  // "Refresh Open Tabs" action, the refresh after Close Tab, in both the
  // Command Bar and the standalone Search Tabs command - must keep using
  // `tabs.revalidate` instead, further down: they need their own loading
  // state and failure toast, and must not be skipped just because a poll
  // happens to be in flight at that moment.
  const pollRefresh = useCallback(async () => {
    if (pollInFlight.current) return;

    pollInFlight.current = true;
    const versionAtStart = mutationVersionRef.current;
    try {
      // Silent: a background poll failing (Orion quit, or briefly declined
      // the request) must not spam a failure toast every interval tick, and
      // must not be treated as "zero tabs" - keep the last known-good
      // snapshot instead of wiping it.
      const nextTabs = await fetchLocalTabsRaw({ silent: true });
      if (nextTabs === undefined) return;
      if (mutationVersionRef.current !== versionAtStart) return;
      if (tabsAreEqual(latestTabsRef.current, nextTabs)) return;

      await tabs.mutate(Promise.resolve(nextTabs), {
        optimisticUpdate: () => nextTabs,
        rollbackOnError: false,
        shouldRevalidateAfter: false,
      });
    } finally {
      pollInFlight.current = false;
    }
  }, [tabs.mutate]);

  // Switching to an already-open tab (the Command Bar's "Open in Browser"
  // action on a Tab hit) changes Orion's current tab immediately, but this
  // cache only learns that from the next AppleScript round trip. Flip the
  // cached `is_current` flags locally and synchronously right away, so a
  // Command Bar reopened before that round trip completes already shows the
  // tab just switched to as current, instead of briefly re-selecting the
  // tab that was current before the switch.
  const markTabActive = useCallback(
    (tab: Tab) => {
      const current = latestTabsRef.current;
      if (!current) return;

      // A poll already in flight may have started reading Orion before this
      // switch happened, and would otherwise resolve afterward and overwrite
      // this optimistic update with its now-stale snapshot.
      mutationVersionRef.current += 1;
      const next = current.map((t) => ({
        ...t,
        is_current: t.window_id === tab.window_id && t.tab_index === tab.tab_index,
      }));
      void tabs.mutate(Promise.resolve(next), {
        optimisticUpdate: () => next,
        rollbackOnError: false,
        shouldRevalidateAfter: false,
      });
    },
    [tabs.mutate],
  );

  // Open Tabs are dynamic. While the Command Bar remains visible, refresh at
  // a modest cadence so tab opens and closes appear without a manual action.
  // The interval is opt-in: the standalone Search Tabs command keeps its
  // existing on-open behavior, and cleanup stops the work on dismissal.
  useEffect(() => {
    if (!refreshWhileOpen) return;

    const timer = setInterval(() => {
      void pollRefresh();
    }, COMMAND_BAR_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [pollRefresh, refreshWhileOpen]);

  // A user-triggered refresh (the "Refresh Open Tabs" action, or the refresh
  // after Close Tab) is authoritative: any poll already in flight when it
  // starts read Orion before whatever this refresh is about to learn, so
  // that poll's eventual result must not be allowed to overwrite this
  // refresh's, no matter which of the two resolves last.
  const refresh = useCallback(async () => {
    mutationVersionRef.current += 1;
    await tabs.revalidate();
  }, [tabs.revalidate]);

  return { ...tabs, refresh, markTabActive };
};

const useTabs = (options?: UseTabsOptions) => {
  const tabs = useLocalTabs(options);
  return { tabs: tabs.data, refresh: tabs.refresh, markTabActive: tabs.markTabActive };
};

export default useTabs;
