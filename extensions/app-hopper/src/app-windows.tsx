import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppGroup, AXWindow, Window, queryAXWindows, queryWindows } from "./windows";
import { rankSearch, remainingSearch, SEARCH_WEIGHT as W } from "./helpers/search";
import { useListSearch } from "./helpers/use-list-search";
import { getWindowAccessories } from "./helpers/window-presentation";

export type RemoveWindow = (windowId: number) => void;

/** Cancel obsolete work and ignore late results even if the underlying query cannot stop. */
function useWindowRefresh<T>(identity: string, load: (signal: AbortSignal) => Promise<T>, apply: (data: T) => void) {
  const abortable = useRef<AbortController | null>(null);
  const [refreshIdentity, setRefreshIdentity] = useState<string | null>(null);
  // usePromise hides loading while execute is false, including during manual revalidation.
  const execute = refreshIdentity === identity;
  const { isLoading, revalidate } = usePromise(() => load(abortable.current!.signal), [], {
    execute,
    abortable,
    onData: apply,
    failureToastOptions: { title: "Failed to refresh windows" },
  });
  // Defer the first scan until Refresh; usePromise owns subsequent reads and their loading state.
  return { isLoading, refresh: execute ? revalidate : () => setRefreshIdentity(identity) };
}

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
  const { isLoading, refresh: refreshAppWindows } = useWindowRefresh(
    app.id,
    async (signal) => {
      const latest = await queryWindows(signal);
      const pids = new Set(app.windows.map((window) => window.pid));
      return latest.filter((window) => pids.has(window.pid));
    },
    (latest) => {
      setWindows(latest);
      onRefresh();
    },
  );

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
  const { isLoading, refresh: refreshAXWindows } = useWindowRefresh(
    app.id,
    async (signal) => {
      const pids = app.pids ?? [...new Set(app.windows.map((window) => window.pid))];
      const latest = await Promise.all(pids.map((pid) => queryAXWindows(pid, signal)));
      return latest.flat();
    },
    (latest) => {
      setWindows(latest);
      onRefresh();
    },
  );

  const filteredWindows = useMemo(
    () =>
      rankSearch(windows, search.searchText, (window) => [
        { value: window.title, weight: W.title },
        { value: app.name, weight: W.context },
      ]),
    [windows, search.searchText, app.name],
  );

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
