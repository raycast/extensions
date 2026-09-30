import { useState } from "react";

import { Icon, List, Action, ActionPanel, closeMainWindow, clearSearchBar, Color } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getSessions, connectToSession, Session } from "./sesh";
import { checkSetup, isSetupError, renderSetupEmptyView } from "./setup";
import { openApp } from "./app";
import { WindowList } from "./windows";

function getIcon(session: Session) {
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

function formatScore(score: number) {
  if (score === 0) return undefined;
  return String(Number.isInteger(score) ? score : score.toFixed(2));
}

export default function ConnectCommand() {
  const [isConnecting, setIsConnecting] = useState(false);

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

  async function connect(session: string) {
    try {
      setIsConnecting(true);
      await connectToSession(session);
      await openApp();
      await closeMainWindow();
      await clearSearchBar();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't connect to session" });
    } finally {
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
    <List isLoading={isLoading || isConnecting}>
      {renderEmptyView()}
      {sessions.map((session, index) => {
        const accessories = [];

        if (session.Src === "tmux") {
          accessories.push({
            icon: Icon.AppWindow,
            text: String(session.Windows),
            tooltip: session.Windows === 1 ? "Window" : "Windows",
          });
        } else {
          accessories.push({
            text: formatScore(session.Score),
            icon: session.Src === "tmuxinator" ? Icon.Box : Icon.Racket,
            tooltip: "Score",
          });
        }

        return (
          <List.Item
            key={index}
            title={session.Name}
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
