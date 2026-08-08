import { useState, useEffect, useCallback } from "react";
import { List, ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast, Color } from "@raycast/api";
import {
  getHistory,
  undoToPoint,
  undoEntry,
  undoFileOperation,
  clearHistory,
  isUndoable,
  previewUndo,
  describeUndoPreview,
} from "./lib/history";
import { HistoryDetailView } from "./components/HistoryDetailView";
import type { RenameHistoryEntry } from "./types";

export default function Command() {
  const [history, setHistory] = useState<RenameHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await getHistory();
      setHistory(entries);
    } catch (err) {
      console.error("Failed to load history:", err);
      setHistory([]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load history",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleUndoToPoint = async (index: number): Promise<void> => {
    await undoToPoint(index);
    // undoToPoint handles its own success/failure toasts;
    // always reload history since partial undos may have modified entries
    await loadHistory();
  };

  // The detail view identifies its entry by timestamp, not index: an index
  // captured when the view was pushed goes stale once a newer rename is
  // recorded or the history is trimmed.
  const resolveEntryIndex = async (timestamp: number): Promise<number> => {
    const entries = await getHistory();
    return entries.findIndex((e) => e.timestamp === timestamp);
  };

  const showEntryGoneToast = async (): Promise<void> => {
    await showToast({
      style: Toast.Style.Failure,
      title: "Entry No Longer in History",
      message: "It may have been trimmed or cleared since this view was opened",
    });
  };

  const handleUndoEntry = async (timestamp: number): Promise<void> => {
    const index = await resolveEntryIndex(timestamp);
    if (index >= 0) {
      await undoEntry(index);
    } else {
      await showEntryGoneToast();
    }
    await loadHistory();
  };

  const handleUndoFile = async (timestamp: number, opIndex: number): Promise<void> => {
    const index = await resolveEntryIndex(timestamp);
    if (index >= 0) {
      await undoFileOperation(index, opIndex);
    } else {
      await showEntryGoneToast();
    }
    await loadHistory();
  };

  const handleUndoWithConfirm = async (index: number) => {
    const operationsCount = index + 1;
    const preview = await previewUndo(history.slice(0, index + 1).flatMap((entry) => entry.operations));
    const source =
      index === 0
        ? `"${history[index]?.description ?? "unknown operation"}"`
        : `every operation back to and including "${history[index]?.description ?? "unknown operation"}"`;
    const confirmed = await confirmAlert({
      title: `Undo ${operationsCount} Operation${operationsCount > 1 ? "s" : ""}?`,
      message: describeUndoPreview(preview, source),
      primaryAction: {
        title: "Undo",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await handleUndoToPoint(index);
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All History?",
      message: "This will remove all rename history. You won't be able to undo any previous operations.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await clearHistory();
        setHistory([]);
        await showToast({
          style: Toast.Style.Success,
          title: "History Cleared",
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to clear history",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search rename history...">
      {history.length === 0 ? (
        <List.EmptyView
          title="No Rename History"
          description="Your rename operations will appear here"
          icon={Icon.Clock}
        />
      ) : (
        <>
          <List.Section title="Recent Operations" subtitle={`${history.length} in history`}>
            {history.map((entry, index) => {
              const undoableCount = entry.operations.filter(isUndoable).length;
              return (
                <List.Item
                  key={entry.timestamp}
                  title={entry.description}
                  subtitle={`${entry.operations.length} item${entry.operations.length !== 1 ? "s" : ""}`}
                  accessories={[
                    { text: formatTime(entry.timestamp) },
                    ...(undoableCount === 0 ? [{ tag: { value: "Undone", color: Color.SecondaryText } }] : []),
                    ...(index === 0 && undoableCount > 0 ? [{ tag: { value: "Latest", color: Color.Green } }] : []),
                  ]}
                  icon={Icon.ArrowCounterClockwise}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Eye}
                        target={
                          <HistoryDetailView
                            entry={entry}
                            onUndoEntry={() => handleUndoEntry(entry.timestamp)}
                            onUndoFile={(opIndex) => handleUndoFile(entry.timestamp, opIndex)}
                          />
                        }
                      />
                      <Action
                        title={index === 0 ? "Undo This Operation" : `Undo ${index + 1} Operations`}
                        icon={Icon.Undo}
                        shortcut={{ modifiers: ["cmd"], key: "z" }}
                        onAction={() => handleUndoWithConfirm(index)}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={loadHistory}
                      />
                      <Action
                        title="Clear All History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                        onAction={handleClearHistory}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
