// Roll History command

import { List, ActionPanel, Action, LaunchType } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { loadHistory, clearHistory, type HistoryEntry } from "./engine/storage";
import RollCommand from "./roll";

export default function HistoryCommand() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshHistory() {
    setIsLoading(true);
    const entries = await loadHistory();
    setHistory(entries);
    setIsLoading(false);
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  async function handleClearHistory() {
    await clearHistory();
    await refreshHistory();
  }

  if (isLoading) {
    return <List isLoading />;
  }

  if (history.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No History"
          description="Your roll history will appear here"
        />
      </List>
    );
  }

  return (
    <List>
      {history.map((entry, index) => {
        const date = new Date(entry.timestamp);
        const formattedDate = date.toLocaleString();
        return (
          <List.Item
            key={index}
            title={entry.expression}
            subtitle={entry.result}
            accessories={[{ text: formattedDate }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Re-roll"
                  target={
                    <RollCommand
                      launchType={LaunchType.UserInitiated}
                      arguments={{ expression: entry.expression }}
                    />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Expression"
                  content={entry.expression}
                />
                <Action.CopyToClipboard
                  title="Copy Result"
                  content={entry.result}
                />
                <Action title="Clear History" onAction={handleClearHistory} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
