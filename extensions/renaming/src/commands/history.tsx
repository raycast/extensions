import { useState, useEffect, useCallback } from "react";
import { List, ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast, Color } from "@raycast/api";
import { getHistory, undoToPoint, clearHistory } from "../lib/history";
import { HistoryDetailView } from "../components/history-detail-view";
import type { RenameHistoryEntry } from "../types";

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

  const handleUndoWithConfirm = async (index: number) => {
    const changesCount = index + 1;
    const confirmed = await confirmAlert({
      title: `Undo ${changesCount} Change${changesCount > 1 ? "s" : ""}?`,
      message:
        index === 0
          ? `This will revert "${history[index]?.description ?? "unknown operation"}"`
          : `This will revert all operations back to and including "${history[index]?.description ?? "unknown operation"}"`,
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
            {history.map((entry, index) => (
              <List.Item
                key={entry.timestamp}
                title={entry.description}
                subtitle={`${entry.operations.length} item${entry.operations.length !== 1 ? "s" : ""}`}
                accessories={[
                  { text: formatTime(entry.timestamp) },
                  index === 0 ? { tag: { value: "Latest", color: Color.Green } } : {},
                ]}
                icon={Icon.ArrowCounterClockwise}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<HistoryDetailView entry={entry} index={index} onUndo={handleUndoToPoint} />}
                    />
                    <Action
                      title={index === 0 ? "Undo This Change" : `Undo ${index + 1} Changes`}
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
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
