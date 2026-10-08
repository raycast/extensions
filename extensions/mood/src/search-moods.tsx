import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { MoodEntry, loadEntries, saveEntries, getMoodEmoji, getMoodTitle, formatDate } from "./lib/data";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  async function reloadEntries() {
    setIsLoading(true);
    try {
      setEntries(await loadEntries());
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load mood entries" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    reloadEntries();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const searchLower = searchText.toLowerCase();
    return (
      entry.mood.toLowerCase().includes(searchLower) ||
      entry.notes.toLowerCase().includes(searchLower) ||
      (entry.tags && entry.tags.some((tag) => tag.toLowerCase().includes(searchLower)))
    );
  });

  async function handleDelete(id: string) {
    // Confirm before deleting
    if (
      await confirmAlert({
        title: "Delete Mood Entry",
        message: "Are you sure you want to delete this mood entry?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        // Remove the entry with the given ID
        const updatedEntries = entries.filter((entry) => entry.id !== id);

        setEntries(updatedEntries);
        await saveEntries(updatedEntries);

        await showToast({
          style: Toast.Style.Success,
          title: "Mood entry deleted",
        });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to delete mood entry" });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search moods, tags, or notes..."
      onSearchTextChange={setSearchText}
      isShowingDetail={showDetail}
    >
      {!isLoading && filteredEntries.length === 0 ? (
        searchText ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No matching moods found"
            description="No matching moods were found. Try a different search term."
          />
        ) : (
          <List.EmptyView
            icon={Icon.Emoji}
            title="No mood entries yet"
            description="Record your first mood to start tracking how you feel over time."
          />
        )
      ) : (
        filteredEntries.map((entry) => (
          <List.Item
            key={entry.id}
            icon={getMoodEmoji(entry.mood)}
            title={getMoodTitle(entry.mood)}
            subtitle={entry.tags?.join(", ") || ""}
            accessories={[{ text: formatDate(entry.date) }]}
            detail={
              <List.Item.Detail
                markdown={`## ${getMoodEmoji(entry.mood)} ${getMoodTitle(entry.mood)}\n\n${entry.notes || "No notes"}\n\n**Tags:** ${entry.tags?.join(", ") || "None"}\n\n**Date:** ${formatDate(entry.date)}`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Sidebar}
                  title={showDetail ? "Hide Details" : "Show Details"}
                  onAction={() => setShowDetail((s) => !s)}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Entry"
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(entry.id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
