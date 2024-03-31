import { useState, useEffect } from "react";

import {
  Icon,
  List,
  Action,
  ActionPanel,
  closeMainWindow,
  clearSearchBar,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { getSessions, connectToSession, isTmuxRunning, Session } from "./sesh";
import { openApp } from "./app";

function getIcon(session: Session) {
  if (session.Src === "tmux") {
    return {
      source: Icon.Bolt,
      tintColor: session.Attached >= 1 ? Color.Green : Color.Blue,
      tooltip: session.Attached >= 1 ? "Attached" : "Detached",
    };
  } else {
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
  const [tmuxSessions, setTmuxSessions] = useState<Array<Session>>([]);
  const [zoxideResults, setZoxideResults] = useState<Array<Session>>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function getAndSetSessions() {
    try {
      const sessions = await getSessions();
      setTmuxSessions(sessions.filter((s) => s.Src === "tmux"));
      setZoxideResults(sessions.filter((s) => s.Src === "zoxide"));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't get sessions",
        message: typeof error === "string" ? error : "Unknown reason",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      if (!(await isTmuxRunning())) {
        await showToast({
          style: Toast.Style.Failure,
          title: "tmux isn't running",
          message: "Please start tmux before using this command.",
        });
        setIsLoading(false);
        return;
      }
      await getAndSetSessions();
    })();
  }, []);

  async function connect(session: string) {
    try {
      setIsLoading(true);
      await connectToSession(session);
      await openApp();
      await closeMainWindow();
      await clearSearchBar();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't connect to session",
        message: typeof error === "string" ? error : "Unknown reason",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="tmux">
        {tmuxSessions.map((session, index) => (
          <List.Item
            key={index}
            title={session.Name}
            icon={getIcon(session)}
            accessories={[
              {
                icon: Icon.AppWindow,
                text: String(session.Windows),
                tooltip: session.Windows === 1 ? "Window" : "Windows",
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Connect to Session" onAction={() => connect(session.Path)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="zoxide">
        {zoxideResults.map((session, index) => (
          <List.Item
            key={index}
            title={session.Name}
            icon={getIcon(session)}
            accessories={[{ text: formatScore(session.Score), icon: Icon.Racket, tooltip: "Score" }]}
            actions={
              <ActionPanel>
                <Action title="Connect to Session" onAction={() => connect(session.Path)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
