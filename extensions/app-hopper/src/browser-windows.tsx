import { Action, ActionPanel, Icon, Keyboard, List, PopToRootType, closeMainWindow } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { browserEmptyState, tabsEmptyState } from "./browser-empty-state";

import type { BrowserConfig, BrowserTab, BrowserWindow } from "./browsers/types";
import { getBrowserById } from "./browsers/registry";
import { getBrowserWindows, focusBrowserTab } from "./browsers/client";
import type { BrowserSnapshot } from "./browsers/snapshot";
import { useBrowserSnapshot } from "./use-browser-snapshot";
import { FirefoxIntegrationAction } from "./firefox-integration";
import { getWindowAccessories } from "./helpers/window-presentation";
import { getBrowserTabProps } from "./helpers/browser-tab-presentation";
import { rankSearch, remainingSearch, searchTerms } from "./helpers/search";
import { useListSearch } from "./helpers/use-list-search";
import { searchBrowserWindows, tabSearchFields } from "./search-results";

async function loadBrowserWindow(browserId: string, windowId: string): Promise<BrowserWindow | null> {
  const browser = getBrowserById(browserId);
  if (!browser) throw new Error(`Unsupported browser: ${browserId}`);
  const windows = await getBrowserWindows(browser);
  return windows.find((window) => window.id === windowId) ?? null;
}

/**
 * Activates a browser tab and closes the Raycast window.
 */
export async function switchBrowserTab(browser: BrowserConfig, window: BrowserWindow, tab: BrowserTab): Promise<void> {
  try {
    await focusBrowserTab(browser, window, tab);

    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to switch tab" });
  }
}

/**
 * Displays all tabs belonging to a specific browser window.
 * Used when the browser has multiple windows.
 */
export function BrowserTabsView({
  browser,
  window,
  initialSearchText = "",
}: {
  browser: BrowserConfig;
  window: BrowserWindow;
  initialSearchText?: string;
}) {
  const search = useListSearch(remainingSearch(initialSearchText, [browser.appName, window.title]));
  const {
    data: currentWindow = window,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(loadBrowserWindow, [browser.id, window.id], {
    initialData: window,
    keepPreviousData: false,
  });
  const tabs = rankSearch(currentWindow?.tabs ?? [], search.searchText, (tab) =>
    tabSearchFields(tab, browser.appName, currentWindow?.title ?? window.title),
  );
  const errorMessage = error ? (error instanceof Error ? error.message : String(error)) : "";

  function renderRefreshAction() {
    return (
      <Action
        title="Refresh List"
        icon={Icon.Repeat}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    );
  }

  return (
    <List
      navigationTitle={currentWindow?.title || window.title || "Browser Tabs"}
      isLoading={isLoading}
      filtering={false}
      {...search}
      searchBarPlaceholder="Search tab title or URL..."
    >
      {tabs.map((tab) => (
        <List.Item
          key={tab.id}
          id={tab.id}
          {...getBrowserTabProps(browser, currentWindow ?? window, tab)}
          actions={
            <ActionPanel>
              <Action
                title="Switch to Tab"
                onAction={() => {
                  if (currentWindow) return switchBrowserTab(browser, currentWindow, tab);
                }}
              />
              {renderRefreshAction()}
              {browser.engine === "firefox" && (
                <FirefoxIntegrationAction browserId={browser.id === "zen" ? "zen" : "firefox"} />
              )}
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        {...tabsEmptyState(browser, currentWindow, errorMessage)}
        actions={
          <ActionPanel>
            {renderRefreshAction()}
            {browser.engine === "firefox" && (
              <FirefoxIntegrationAction browserId={browser.id === "zen" ? "zen" : "firefox"} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}

/**
 * Displays browser windows or tabs based on the
 * number of currently available windows.
 *
 * - 0 windows: Show an empty state.
 * - 1 window: Display tabs directly.
 * - 2+ windows: Display windows with nested tabs.
 */
export function BrowserWindowsView({
  browser,
  initialSnapshot,
  initialSearchText = "",
}: {
  browser: BrowserConfig;
  initialSnapshot?: BrowserSnapshot;
  initialSearchText?: string;
}) {
  const search = useListSearch(remainingSearch(initialSearchText, [browser.appName]));
  const { data: windows = [], isLoading, error, revalidate } = useBrowserSnapshot(browser, initialSnapshot);

  const query = search.searchText;
  const hasQuery = searchTerms(query).length > 0;
  const singleWindow = windows.length === 1 ? windows[0] : undefined;
  const singleWindowTabs = singleWindow
    ? rankSearch(singleWindow.tabs, query, (tab) => tabSearchFields(tab, browser.appName, singleWindow.title))
    : [];
  const results = hasQuery && !singleWindow ? searchBrowserWindows(windows, browser.appName, query) : [];

  const errorMessage = error ? (error instanceof Error ? error.message : String(error)) : "";

  function renderRefreshAction() {
    return (
      <Action
        title="Refresh List"
        icon={Icon.Repeat}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    );
  }

  function tabsAction(window: BrowserWindow) {
    return (
      <Action.Push
        title="Show Tabs"
        target={
          <BrowserTabsView
            browser={browser}
            window={window}
            initialSearchText={remainingSearch(query, [browser.appName, window.title])}
          />
        }
      />
    );
  }

  function renderTab(window: BrowserWindow, tab: BrowserTab) {
    return (
      <List.Item
        key={`tab:${window.id}:${tab.id}`}
        id={`tab:${window.id}:${tab.id}`}
        {...getBrowserTabProps(browser, window, tab)}
        actions={
          <ActionPanel>
            <Action title="Switch to Tab" onAction={() => switchBrowserTab(browser, window, tab)} />
            {!singleWindow && tabsAction(window)}
            {renderRefreshAction()}
            {browser.engine === "firefox" && (
              <FirefoxIntegrationAction browserId={browser.id === "zen" ? "zen" : "firefox"} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  function renderWindow(window: BrowserWindow) {
    return (
      <List.Item
        key={`window:${window.id}`}
        id={`window:${window.id}`}
        icon={browser.appPath ? { fileIcon: browser.appPath } : Icon.Globe}
        title={window.title || "Untitled Window"}
        subtitle={
          window.tabListUnavailable
            ? "Tab list unavailable"
            : `${window.tabs.length} ${window.tabs.length === 1 ? "tab" : "tabs"}`
        }
        accessories={getWindowAccessories(window)}
        actions={
          <ActionPanel>
            {tabsAction(window)}
            {renderRefreshAction()}
            {browser.engine === "firefox" && (
              <FirefoxIntegrationAction browserId={browser.id === "zen" ? "zen" : "firefox"} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  function renderContents() {
    if (singleWindow) return singleWindowTabs.map((tab) => renderTab(singleWindow, tab));
    if (!hasQuery) return windows.map(renderWindow);
    return results.map((result) => {
      if (result.kind === "tab") return renderTab(result.window, result.tab);
      return renderWindow(result.window);
    });
  }

  return (
    <List
      navigationTitle={browser.appName}
      {...search}
      searchBarPlaceholder={
        singleWindow ? "Search tabs or URLs..." : `Search ${browser.appName} windows, tabs or URLs...`
      }
      isLoading={isLoading && windows.length === 0}
      filtering={false}
    >
      {renderContents()}
      <List.EmptyView
        {...browserEmptyState(browser, singleWindow, hasQuery, errorMessage)}
        actions={
          <ActionPanel>
            {renderRefreshAction()}
            {browser.engine === "firefox" && (
              <FirefoxIntegrationAction browserId={browser.id === "zen" ? "zen" : "firefox"} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
