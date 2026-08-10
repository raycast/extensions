import { List, ActionPanel, Action, Icon, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getHistory, deleteHistoryEntry, clearHistory, HistoryEntry } from "./history-storage";

const MODE_LABELS: Record<string, string> = {
  general: "General",
  email: "Email",
  slack: "Slack / Chat",
  notes: "Notes",
  custom: "Custom",
};

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export default function TranscriptionHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    const history = await getHistory();
    setEntries(history);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleDelete(id: string) {
    await deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await showToast({ style: Toast.Style.Success, title: "Deleted" });
  }

  async function handleClearAll() {
    if (
      await confirmAlert({
        title: "Delete All History",
        message: "This will permanently delete all dictation history.",
        primaryAction: {
          title: "Delete All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await clearHistory();
      setEntries([]);
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search dictation history..." isShowingDetail={entries.length > 0}>
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView title="No Dictations Yet" description="Record something with Dictate to see it here." />
      ) : (
        entries.map((entry) => (
          <List.Item
            key={entry.id}
            title={entry.cleanedText.split("\n")[0].slice(0, 60)}
            subtitle={formatDate(entry.timestamp)}
            keywords={[entry.cleanedText, entry.rawTranscription]}
            accessories={[
              { tag: MODE_LABELS[entry.mode] || entry.mode },
              { text: `${entry.cleanedText.length} chars` },
            ]}
            detail={
              <List.Item.Detail
                markdown={entry.cleanedText}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Transcribed On" text={formatDate(entry.timestamp)} />
                    <List.Item.Detail.Metadata.Label title="Mode" text={MODE_LABELS[entry.mode] || entry.mode} />
                    <List.Item.Detail.Metadata.Label title="Characters" text={String(entry.cleanedText.length)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Transcription">
                  <Action.CopyToClipboard title="Copy Text" content={entry.cleanedText} />
                  <Action.Paste
                    title="Paste Text"
                    content={entry.cleanedText}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage History">
                  <Action
                    title="Delete Item"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(entry.id)}
                  />
                  <Action
                    title="Delete All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={handleClearAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
