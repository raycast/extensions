import { useState, useEffect } from "react";

import { List, Action, ActionPanel, closeMainWindow, clearSearchBar } from "@raycast/api";
import { listSessions, connectToSession } from "./sesh";
import { openApp } from "./app";

export default function ConnectCommand() {
  const [sessions, setSessions] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      listSessions((error, stdout) => {
        if (error) {
          setIsLoading(false);
          return;
        }
        const sessions = stdout.trim().split("\n");
        if (sessions?.length > 0) {
          setSessions(sessions);
        }
        setIsLoading(false);
      });
    })();
  }, []);

  return (
    <List isLoading={isLoading}>
      {sessions.map((session, index) => (
        <List.Item
          key={index}
          title={session}
          actions={
            <ActionPanel>
              <Action
                title="Connect to Session"
                onAction={async () => {
                  await connectToSession(session, setIsLoading);
                  openApp();
                  await closeMainWindow();
                  await clearSearchBar();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
