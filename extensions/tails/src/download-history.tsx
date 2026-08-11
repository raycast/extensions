import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { existsSync } from "node:fs";

import { clearHistory, type HistoryEntry, loadHistory, removeHistoryEntry } from "./lib/history";

export default function DownloadHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory()
      .then(setHistory)
      .catch(() =>
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load history",
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleClear() {
    const confirmed = await confirmAlert({
      title: "Clear Download History",
      message: "This clears the list only. Your downloaded files stay where they are.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearHistory();
      setHistory([]);
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
    }
  }

  async function handleRemove(id: string) {
    const updated = await removeHistoryEntry(id);
    setHistory(updated);
    await showToast({ style: Toast.Style.Success, title: "Entry removed" });
  }

  const grouped = history.reduce(
    (acc, entry) => {
      const label = formatDateGroup(entry.timestamp);
      if (!acc[label]) acc[label] = [];
      acc[label].push(entry);
      return acc;
    },
    {} as Record<string, HistoryEntry[]>,
  );

  return (
    <List isLoading={loading} searchBarPlaceholder="Search download history…">
      {history.length === 0 && !loading && (
        <List.EmptyView
          icon={Icon.Download}
          title="No downloads yet"
          description="Files you download will appear here."
        />
      )}

      {Object.entries(grouped).map(([date, entries]) => (
        <List.Section key={date} title={date}>
          {entries.map((entry) => {
            const fileExists = entry.status === "completed" && existsSync(entry.downloadPath);

            return (
              <List.Item
                key={entry.id}
                icon={statusIcon(entry, fileExists)}
                title={entry.filename}
                subtitle={entry.platform}
                accessories={[
                  {
                    date: new Date(entry.timestamp),
                    tooltip: new Date(entry.timestamp).toLocaleString(),
                  },
                ]}
                actions={
                  <ActionPanel>
                    {fileExists && (
                      <Action.ShowInFinder
                        title="Show File"
                        path={entry.downloadPath}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                    )}
                    {fileExists && <Action.Open title="Open File" target={entry.downloadPath} icon={Icon.Play} />}
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={entry.url}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.OpenInBrowser title="Open Original" url={entry.url} />
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => handleRemove(entry.id)}
                    />
                    <Action
                      title="Clear All History"
                      icon={Icon.ExclamationMark}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={handleClear}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function statusIcon(entry: HistoryEntry, fileExists: boolean) {
  if (entry.status === "failed") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  if (!fileExists) {
    return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  }
  return { source: Icon.CheckCircle, tintColor: Color.Green };
}

function formatDateGroup(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}
