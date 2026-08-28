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
  getEffectiveOperations,
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

  // Every undo below addresses its entry by timestamp — the entry's identity.
  // An index into this component's state goes stale the moment another command
  // records a rename (entries unshift to the front) or history is trimmed; the
  // lib re-resolves the timestamp against a fresh read and toasts when the
  // entry is gone.
  const handleUndoEntry = async (timestamp: number): Promise<void> => {
    await undoEntry(timestamp);
    // undoEntry handles its own success/failure toasts;
    // always reload history since partial undos may have modified entries
    await loadHistory();
  };

  const handleUndoFile = async (timestamp: number, opIndex: number): Promise<void> => {
    await undoFileOperation(timestamp, opIndex);
    await loadHistory();
  };

  const handleUndoWithConfirm = async (timestamp: number) => {
    // Preview against a fresh read, not this component's snapshot: entries
    // recorded since the list was loaded are part of the range being undone.
    const entries = await getHistory();
    const index = entries.findIndex((e) => e.timestamp === timestamp);
    if (index < 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Entry No Longer in History",
        message: "It may have been trimmed or cleared since this view was opened",
      });
      await loadHistory();
      return;
    }

    const operationsCount = index + 1;
    const preview = await previewUndo(entries.slice(0, index + 1).flatMap(getEffectiveOperations));
    const source =
      index === 0
        ? `"${entries[index]?.description ?? "unknown operation"}"`
        : `every operation back to and including "${entries[index]?.description ?? "unknown operation"}"`;
    const confirmed = await confirmAlert({
      title: `Undo ${operationsCount} Operation${operationsCount > 1 ? "s" : ""}?`,
      message: describeUndoPreview(preview, source),
      primaryAction: {
        title: "Undo",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await undoToPoint(timestamp);
      await loadHistory();
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
                        onAction={() => handleUndoWithConfirm(entry.timestamp)}
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
