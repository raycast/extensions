import { useEffect, useRef, useState } from "react";

import { Icon, List, Action, ActionPanel, closeMainWindow, clearSearchBar, Color } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getSessions, connectToSession, Session } from "./sesh";
import { checkSetup, isSetupError, renderSetupEmptyView } from "./setup";
import { openApp } from "./app";
import { WindowList } from "./windows";

function getIcon(session: Session) {
  if (session.Icon) {
    return session.Icon;
  }
  switch (session.Src) {
    case "tmux":
      return {
        source: Icon.Bolt,
        tintColor: session.Attached >= 1 ? Color.Green : Color.Blue,
        tooltip: session.Attached >= 1 ? "Attached" : "Detached",
      };
    case "tmuxinator":
      return {
        source: Icon.Box,
        tintColor: Color.Magenta,
      };
    case "config":
      return {
        source: Icon.Cog,
        tintColor: Color.SecondaryText,
      };
    case "zoxide":
    default:
      return {
        source: Icon.Folder,
        tintColor: Color.SecondaryText,
      };
  }
}

const ALIAS_AUTO_CONNECT_DELAY_MS = 150;
const ALIAS_PREFIX = "/";

export default function ConnectCommand() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const connectingRef = useRef(false);
  const autoConnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      await checkSetup();
      return (await getSessions()) ?? [];
    },
    [],
    {
      keepPreviousData: true,
      onError: (error) => {
        if (isSetupError(error)) {
          return;
        }
        showFailureToast(error, { title: "Couldn't get sessions" });
      },
    },
  );
  const sessions = isSetupError(error) ? [] : (data ?? []);
  const aliasQuery = searchText.startsWith(ALIAS_PREFIX)
    ? searchText.slice(ALIAS_PREFIX.length).toLowerCase()
    : undefined;
  const aliasMatch = sessions.find(
    (session) => session.Alias && session.Alias.toLowerCase() === (aliasQuery ?? searchText.toLowerCase()),
  );
  const visibleSessions = aliasMatch
    ? [aliasMatch]
    : aliasQuery !== undefined
      ? sessions.filter((session) => session.Alias && session.Alias.toLowerCase().startsWith(aliasQuery))
      : sessions;
  const autoConnectTarget =
    aliasMatch && (aliasQuery !== undefined || aliasMatch.AliasAutoConnect) ? aliasMatch.Name : undefined;

  useEffect(() => {
    if (!autoConnectTarget) return;
    autoConnectTimerRef.current = setTimeout(() => connect(autoConnectTarget), ALIAS_AUTO_CONNECT_DELAY_MS);
    return () => clearTimeout(autoConnectTimerRef.current);
  }, [autoConnectTarget]);

  async function connect(session: string) {
    clearTimeout(autoConnectTimerRef.current);
    if (connectingRef.current) return;
    connectingRef.current = true;
    try {
      setIsConnecting(true);
      await connectToSession(session);
      await openApp();
      await closeMainWindow();
      await clearSearchBar();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't connect to session" });
    } finally {
      connectingRef.current = false;
      setIsConnecting(false);
    }
  }

  const refreshAction = (
    <Action
      title="Refresh Sessions"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={revalidate}
    />
  );

  function renderEmptyView() {
    const setupEmptyView = renderSetupEmptyView(error, refreshAction);
    if (setupEmptyView) {
      return setupEmptyView;
    }
    if (error) {
      return (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load sessions"
          description="Press ⌘R to retry."
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      );
    }
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No sessions found"
        description="Press ⌘R to refresh."
        actions={<ActionPanel>{refreshAction}</ActionPanel>}
      />
    );
  }

  return (
    <List
      key={aliasQuery === undefined ? "search" : "alias"}
      isLoading={isLoading || isConnecting}
      filtering={aliasQuery === undefined}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {renderEmptyView()}
      {visibleSessions.map((session, index) => {
        const accessories = [];

        if (session.Alias) {
          accessories.push({ tag: session.Alias, tooltip: "Alias" });
        }

        if (session.Src === "tmux" && !session.TmuxWindows) {
          accessories.push({
            icon: Icon.AppWindow,
            text: String(session.Windows),
            tooltip: session.Windows === 1 ? "Window" : "Windows",
          });
        }

        return (
          <List.Item
            key={index}
            title={session.Name}
            keywords={session.Alias ? [session.Alias] : undefined}
            subtitle={session.TmuxWindows?.map((window) => window.Name).join("  ")}
            icon={getIcon(session)}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action title="Connect to Session" onAction={() => connect(session.Name)} />
                {session.Src === "tmux" && (
                  <Action.Push
                    title="Search Windows"
                    icon={Icon.AppWindowList}
                    target={<WindowList session={session.Name} />}
                  />
                )}
                {refreshAction}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
