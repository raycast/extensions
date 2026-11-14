import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { AppGroup, AXWindow, Window, queryAXWindows, queryWindows } from "./windows";
import { rankSearch, remainingSearch, SEARCH_WEIGHT as W } from "./helpers/search";
import { useListSearch } from "./helpers/use-list-search";
import { getWindowAccessories } from "./helpers/window-presentation";

export type RemoveWindow = (windowId: number) => void;

export function AppWindowsView({
  app,
  onFocus,
  onRefresh,
  initialSearchText = "",
}: {
  app: AppGroup;
  onFocus: (window: Window, onRemoved?: RemoveWindow) => Promise<void>;
  onRefresh: () => void;
  initialSearchText?: string;
}) {
  const [windows, setWindows] = useState(app.windows);
  const search = useListSearch(remainingSearch(initialSearchText, [app.name]));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setWindows(app.windows);
  }, [app.windows]);

  const filteredWindows = useMemo(
    () =>
      rankSearch(windows, search.searchText, (window) => [
        { value: window.title, weight: W.title },
        { value: app.name, weight: W.context },
      ]),
    [windows, search.searchText, app.name],
  );

  function removeWindow(windowId: number) {
    setWindows((current) => current.filter((window) => window.id !== windowId));
  }

  async function refreshAppWindows() {
    setIsLoading(true);

    try {
      const latest = await queryWindows();
      const pids = new Set(app.windows.map((window) => window.pid));
      setWindows(latest.filter((window) => pids.has(window.pid)));
      onRefresh();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to refresh windows" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${app.name} Windows`}
      filtering={false}
      {...search}
      searchBarPlaceholder={`Search ${app.name} windows...`}
    >
      {filteredWindows.length === 0 ? (
        <List.EmptyView
          title="No Windows"
          description="No matching windows are available."
          actions={
            <ActionPanel>
              <Action
                title="Refresh List"
                icon={Icon.Repeat}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refreshAppWindows}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredWindows.map((window) => (
          <List.Item
            key={window.id}
            id={String(window.id)}
            icon={app.bundlePath ? { fileIcon: app.bundlePath } : Icon.AppWindow}
            title={window.title || `Window ${window.id}`}
            accessories={getWindowAccessories(window)}
            actions={
              <ActionPanel>
                <Action icon={Icon.AppWindow} title="Focus Window" onAction={() => onFocus(window, removeWindow)} />
                <Action
                  title="Refresh List"
                  icon={Icon.Repeat}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refreshAppWindows}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export function AXWindowsView({
  app,
  windows: initialWindows,
  initialSearchText = "",
  onFocus,
  onRefresh,
}: {
  app: AppGroup;
  windows: AXWindow[];
  initialSearchText?: string;
  onFocus: (window: AXWindow) => Promise<void>;
  onRefresh: () => void;
}) {
  const [windows, setWindows] = useState(initialWindows);
  const search = useListSearch(remainingSearch(initialSearchText, [app.name]));
  const [isLoading, setIsLoading] = useState(false);

  const filteredWindows = useMemo(
    () =>
      rankSearch(windows, search.searchText, (window) => [
        { value: window.title, weight: W.title },
        { value: app.name, weight: W.context },
      ]),
    [windows, search.searchText, app.name],
  );

  async function refreshAXWindows() {
    setIsLoading(true);

    try {
      const pids = app.pids ?? [...new Set(app.windows.map((window) => window.pid))];
      const latest = await Promise.all(pids.map(queryAXWindows));
      setWindows(latest.flat());
      onRefresh();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to refresh windows" });
    } finally {
      setIsLoading(false);
    }
  }

  const refreshAction = (
    <Action
      title="Refresh List"
      icon={Icon.Repeat}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={refreshAXWindows}
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${app.name} Windows`}
      filtering={false}
      {...search}
      searchBarPlaceholder={`Search ${app.name} windows...`}
    >
      {filteredWindows.length === 0 ? (
        <List.EmptyView
          title="No Windows"
          description="No matching windows are available."
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      ) : (
        filteredWindows.map((window) => (
          <List.Item
            key={`${window.pid}-${window.index}`}
            id={`${window.pid}-${window.index}`}
            icon={app.bundlePath ? { fileIcon: app.bundlePath } : Icon.AppWindow}
            title={window.title || `Window ${window.index}`}
            accessories={getWindowAccessories(window)}
            actions={
              <ActionPanel>
                <Action icon={Icon.AppWindow} title="Focus Window" onAction={() => onFocus(window)} />
                {refreshAction}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
