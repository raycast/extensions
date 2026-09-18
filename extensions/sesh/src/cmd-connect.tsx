import { useState } from "react";

import { Icon, List, Action, ActionPanel, closeMainWindow, clearSearchBar, Color } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getSessions, connectToSession, isTmuxRunning, Session } from "./sesh";
import { openApp } from "./app";

export class TmuxNotRunningError extends Error {
  constructor() {
    super("Please start tmux before using this command.");
    this.name = "TmuxNotRunningError";
  }
}

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

  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      if (!(await isTmuxRunning())) {
        throw new TmuxNotRunningError();
      }
      return (await getSessions()) ?? [];
    },
    [],
    {
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, {
          title: error instanceof TmuxNotRunningError ? "tmux isn't running" : "Couldn't get sessions",
        });
      },
    },
  );
  const sessions = data ?? [];

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

  return (
    <List isLoading={isLoading || isConnecting}>
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
                <Action
                  title="Refresh Sessions"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
