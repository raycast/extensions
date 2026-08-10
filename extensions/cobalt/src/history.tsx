import {
  List,
  Grid,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";
import crypto from "crypto";
import fs from "fs";
import type { HistoryEntry } from "./types";
import { getServiceFromUrl } from "./utils";

const HISTORY_KEY = "cobalt-download-history";
const MAX_HISTORY_ENTRIES = 1000;

export default function HistoryCommand() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryEntry[];
        setHistory(parsed.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load history", String(error));
    } finally {
      setLoading(false);
    }
  }

  async function clearHistory() {
    const confirmed = await confirmAlert({
      title: "Clear Download History",
      message: "Are you sure you want to clear all download history? This action cannot be undone.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await LocalStorage.removeItem(HISTORY_KEY);
      setHistory([]);
      showToast(Toast.Style.Success, "History cleared");
    }
  }

  async function removeEntry(id: string) {
    setHistory((currentHistory) => {
      const newHistory = currentHistory.filter((entry) => entry.id !== id);
      LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
    showToast(Toast.Style.Success, "Entry removed");
  }

  function getContent(entry: HistoryEntry) {
    if (entry.thumbnailUrl && fs.existsSync(entry.thumbnailUrl)) {
      return entry.thumbnailUrl;
    }

    return entry.status === "completed"
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : { source: Icon.XMarkCircle, tintColor: Color.Red };
  }

  const groupedHistory = history.reduce(
    (groups, entry) => {
      const date = new Date(entry.timestamp).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
      return groups;
    },
    {} as Record<string, HistoryEntry[]>,
  );

  if (history.length === 0) {
    return (
      <List isLoading={loading} searchBarPlaceholder="Search download history...">
        <List.EmptyView
          icon={Icon.Download}
          title="No downloads yet"
          description="Your download history will appear here."
        />
      </List>
    );
  }

  return (
    <Grid isLoading={loading} searchBarPlaceholder="Search download history...">
      {Object.entries(groupedHistory).map(([date, entries]) => (
        <Grid.Section key={date} title={date}>
          {entries.map((entry) => {
            const entryExists = entry.status === "completed" && fs.existsSync(entry.downloadPath);
            return (
              <Grid.Item
                key={entry.id}
                content={getContent(entry)}
                title={entry.filename}
                subtitle={getServiceFromUrl(entry.url)}
                actions={
                  <ActionPanel>
                    {entryExists && <Action.Open title="Open File" target={entry.downloadPath} icon={Icon.Play} />}
                    {entryExists && (
                      <Action.ShowInFinder
                        title="Show in Finder"
                        path={entry.downloadPath}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={entry.url}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard
                      title="Copy File Name"
                      content={entry.filename}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => removeEntry(entry.id)}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                    <Action
                      title="Clear All History"
                      icon={Icon.ExclamationMark}
                      style={Action.Style.Destructive}
                      onAction={clearHistory}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
}

export async function addToHistory(entry: Omit<HistoryEntry, "id" | "timestamp">) {
  try {
    const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
    const history: HistoryEntry[] = stored ? JSON.parse(stored) : [];

    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    history.unshift(newEntry);

    if (history.length > MAX_HISTORY_ENTRIES) {
      history.splice(MAX_HISTORY_ENTRIES);
    }

    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to add to history:", error);
  }
}
