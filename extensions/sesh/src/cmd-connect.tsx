import { useState, useEffect } from "react";

import { List, Action, ActionPanel, closeMainWindow, clearSearchBar, showToast, Toast } from "@raycast/api";
import { getSessions, connectToSession, isTmuxRunning } from "./sesh";
import { openApp } from "./app";

export default function ConnectCommand() {
  const [sessions, setSessions] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function getAndSetSessions() {
    try {
      const sessions = await getSessions();
      setSessions(sessions);
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
      {sessions.map((session, index) => (
        <List.Item
          key={index}
          title={session}
          actions={
            <ActionPanel>
              <Action title="Connect to Session" onAction={() => connect(session)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
