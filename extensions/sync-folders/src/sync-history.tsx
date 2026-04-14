import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { SyncHistoryEntry } from "./types";
import { clearSyncHistory, getSyncHistory } from "./utils";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function Command() {
  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSyncHistory().then((h) => {
      setHistory(h);
      setIsLoading(false);
    });
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sync history...">
      {history.length === 0 && !isLoading ? (
        <List.EmptyView title="No Sync History" description="Sync history will appear here after you sync folders." />
      ) : (
        history.map((entry, i) => (
          <List.Item
            key={`${entry.timestamp}-${i}`}
            icon={
              entry.success
                ? { source: Icon.Check, tintColor: Color.Green }
                : { source: Icon.Xmark, tintColor: Color.Red }
            }
            title={entry.name}
            subtitle={`${entry.source_folder} → ${entry.dest_folder}`}
            accessories={[
              { text: formatDuration(entry.duration) },
              ...(entry.fileCount !== undefined ? [{ text: `${entry.fileCount} files` }] : []),
              { date: new Date(entry.timestamp) },
            ]}
            actions={
              <ActionPanel>
                <Action.ShowInFinder title="Show Source" path={entry.source_folder} />
                <Action.ShowInFinder title="Show Destination" path={entry.dest_folder} />
                {entry.error && <Action.CopyToClipboard title="Copy Error" content={entry.error} />}
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  onAction={async () => {
                    await clearSyncHistory();
                    setHistory([]);
                    await showToast({ style: Toast.Style.Success, title: "History cleared" });
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
