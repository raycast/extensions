import { ReactNode, useState } from "react";
import { homedir } from "os";

import { Icon, List, Action, ActionPanel, closeMainWindow, PopToRootType, Color } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getWindows, connectToWindow, switchToWindow, Window } from "./sesh";
import { openApp } from "./app";

function shortenPath(path: string) {
  const home = homedir();
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

export function useWindowConnect() {
  const [isConnecting, setIsConnecting] = useState(false);

  async function run(connect: () => Promise<void>) {
    try {
      setIsConnecting(true);
      await connect();
      await openApp();
      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't connect to window" });
    } finally {
      setIsConnecting(false);
    }
  }

  return {
    isConnecting,
    connect: (session: string, window: Window, sessionWindows: Window[]) =>
      run(() => switchToWindow(session, window, sessionWindows)),
    create: (session: string, name: string) => run(() => connectToWindow(session, name, { create: true })),
  };
}

export function WindowItem({
  window,
  keywords,
  onConnect,
  refreshAction,
}: {
  window: Window;
  keywords?: string[];
  onConnect: () => void;
  refreshAction: ReactNode;
}) {
  return (
    <List.Item
      title={window.Name}
      subtitle={shortenPath(window.Path)}
      icon={{ source: Icon.AppWindow, tintColor: window.Active ? Color.Green : Color.SecondaryText }}
      keywords={[String(window.Index), ...(keywords ?? [])]}
      accessories={[
        ...(window.Active ? [{ icon: Icon.Checkmark, tooltip: "Current window" }] : []),
        { text: `#${window.Index}`, tooltip: "Window index" },
      ]}
      actions={
        <ActionPanel>
          <Action title="Connect to Window" icon={Icon.Terminal} onAction={onConnect} />
          {refreshAction}
        </ActionPanel>
      }
    />
  );
}

export function WindowList({ session }: { session: string }) {
  const [searchText, setSearchText] = useState("");
  const { isConnecting, connect, create } = useWindowConnect();

  const { data, isLoading, error, revalidate } = useCachedPromise(getWindows, [session], {
    keepPreviousData: true,
    onError: (error) => {
      showFailureToast(error, { title: "Couldn't get windows" });
    },
  });
  const windows = data ?? [];
  const name = searchText.trim();

  const refreshAction = (
    <Action
      title="Refresh Windows"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={revalidate}
    />
  );

  return (
    <List
      navigationTitle={session}
      searchBarPlaceholder={`Search windows in ${session}`}
      isLoading={isLoading || isConnecting}
      filtering
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load windows"
          description="The session may have been closed. Press ⌘R to retry."
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      ) : (
        <List.EmptyView icon={Icon.AppWindow} title="No windows found" />
      )}
      <List.Section title="Windows">
        {windows.map((window) => (
          <WindowItem
            key={window.Index}
            window={window}
            onConnect={() => connect(session, window, windows)}
            refreshAction={refreshAction}
          />
        ))}
      </List.Section>
      {name && !windows.some((w) => w.Name === name) && (
        <List.Section title="New">
          <List.Item
            title={`Create Window "${name}"`}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action title="Create Window" icon={Icon.Plus} onAction={() => create(session, name)} />
                {refreshAction}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
