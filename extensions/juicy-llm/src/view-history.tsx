import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { clearHistory, deleteHistoryEntry, getHistory } from "./storage";
import type { HistoryEntry } from "./types";
import { searchHistory } from "./utils/search-history";

export default function ViewHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadHistory = useCallback(async () => {
    const data = await getHistory();
    setEntries(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredEntries(entries);
    } else {
      setFilteredEntries(searchHistory(entries, searchText));
    }
  }, [searchText, entries]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (
        await confirmAlert({
          title: "Delete Entry",
          message: "Are you sure you want to delete this history entry?",
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        })
      ) {
        await deleteHistoryEntry(id);
        await loadHistory();
      }
    },
    [loadHistory],
  );

  const handleClearAll = useCallback(async () => {
    if (
      await confirmAlert({
        title: "Clear All History",
        message: "Are you sure you want to delete all history entries?",
        primaryAction: {
          title: "Clear All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await clearHistory();
      await loadHistory();
    }
  }, [loadHistory]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search history..."
      navigationTitle="View History"
    >
      <List.EmptyView
        title="No History"
        description="LLM execution history will appear here."
        icon={Icon.Clock}
      />
      {filteredEntries.map((entry) => (
        <List.Item
          key={entry.id}
          title={
            entry.originalText.length > 80
              ? `${entry.originalText.substring(0, 80)}...`
              : entry.originalText
          }
          subtitle={entry.commandLabel}
          accessories={[{ date: new Date(entry.timestamp) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Result"
                content={entry.resultText}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => handleDelete(entry.id)}
              />
              <Action
                title="Clear All History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={handleClearAll}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
