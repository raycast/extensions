import { Action, ActionPanel, List, Clipboard, showToast, Toast, Alert, confirmAlert, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { StorageManager } from "../core/storage";
import { HistoryItem } from "../core/types";
import { formatTimeAgo } from "../utils/helpers";
import { formatPresetDescription } from "../ui/utils/formatting";
import { SUCCESS_MESSAGES } from "../core/constants";

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const historyItems = await StorageManager.getHistory();
      setHistory(historyItems);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load History",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyEnhanced = async (item: HistoryItem) => {
    await Clipboard.copy(item.output);
    await showToast({
      style: Toast.Style.Success,
      title: SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD,
      message: "Enhanced prompt copied to clipboard",
    });
  };

  const handleCopyOriginal = async (item: HistoryItem) => {
    await Clipboard.copy(item.input);
    await showToast({
      style: Toast.Style.Success,
      title: SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD,
      message: "Original prompt copied to clipboard",
    });
  };

  const handlePaste = async (item: HistoryItem) => {
    await Clipboard.paste(item.output);
    await showToast({
      style: Toast.Style.Success,
      title: SUCCESS_MESSAGES.PASTED_SUCCESSFULLY,
      message: "Enhanced prompt pasted to active app",
    });
  };

  const handleExportJson = async (item: HistoryItem) => {
    const exportData = {
      id: item.id,
      timestamp: item.timestamp,
      created: new Date(item.timestamp).toISOString(),
      preset: item.presetId,
      original: item.input,
      enhanced: item.output,
      metadata: {
        ...item.metadata,
        version: "1.0.0",
        tool: "Promptify",
      },
    };

    await Clipboard.copy(JSON.stringify(exportData, null, 2));
    await showToast({
      style: Toast.Style.Success,
      title: "JSON Exported",
      message: "Prompt data copied as JSON",
    });
  };

  const handleDelete = async (item: HistoryItem) => {
    const confirmed = await confirmAlert({
      title: "Delete History Item",
      message: "Are you sure you want to delete this prompt from history?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await StorageManager.deleteHistoryItem(item.id);
        setHistory((prev) => prev.filter((h) => h.id !== item.id));
        await showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.DELETED_FROM_HISTORY,
          message: "Prompt removed from history",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Delete Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleClearAll = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "Are you sure you want to delete all history items? This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await StorageManager.clearHistory();
        setHistory([]);
        await showToast({
          style: Toast.Style.Success,
          title: SUCCESS_MESSAGES.HISTORY_CLEARED,
          message: "All history items deleted",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clear Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleExportAllJson = async () => {
    if (history.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No History to Export",
        message: "History is empty",
      });
      return;
    }

    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        tool: "Promptify",
        version: "1.0.0",
        total_items: history.length,
      },
      history: history.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        created: new Date(item.timestamp).toISOString(),
        preset: item.presetId,
        original: item.input,
        enhanced: item.output,
        metadata: {
          ...item.metadata,
          original_length: item.input.length,
          enhanced_length: item.output.length,
          enhancement_ratio: (item.output.length / item.input.length).toFixed(2),
        },
      })),
    };

    await Clipboard.copy(JSON.stringify(exportData, null, 2));
    await showToast({
      style: Toast.Style.Success,
      title: "All History Exported",
      message: `${history.length} items copied as JSON`,
    });
  };

  const getPresetIcon = (presetId: string) => {
    switch (presetId) {
      case "general":
        return { source: Icon.Document, tintColor: Color.Blue };
      case "images":
        return { source: Icon.Image, tintColor: Color.Purple };
      case "code":
        return { source: Icon.Code, tintColor: Color.Green };
      default:
        return { source: Icon.Gear, tintColor: Color.SecondaryText };
    }
  };

  const EmptyView = () => (
    <List.EmptyView
      icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
      title="No History Yet"
      description="Enhanced prompts will appear here after you use Promptify commands"
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${history.length} history items...`}
      actions={
        history.length > 0 ? (
          <ActionPanel>
            <Action
              title="Clear All History"
              onAction={handleClearAll}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {history.length === 0 && !isLoading ? (
        <EmptyView />
      ) : (
        history.map((item) => (
          <List.Item
            key={item.id}
            icon={getPresetIcon(item.presetId)}
            title={item.input.length > 60 ? item.input.substring(0, 60) + "..." : item.input}
            subtitle={formatPresetDescription(item.presetId)}
            accessories={[
              { text: formatTimeAgo(item.timestamp) },
              {
                text: `${item.output.length} chars`,
                tooltip: `Enhanced output: ${item.output.length} characters`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Copy & Paste">
                  <Action
                    title="Copy Enhanced Prompt"
                    onAction={() => handleCopyEnhanced(item)}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Paste Enhanced Prompt"
                    onAction={() => handlePaste(item)}
                    icon={Icon.Document}
                    shortcut={{ modifiers: ["cmd"], key: "v" }}
                  />
                  <Action
                    title="Copy Original Prompt"
                    onAction={() => handleCopyOriginal(item)}
                    icon={Icon.Text}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Export & Manage">
                  <Action
                    title="Export as JSON"
                    onAction={() => handleExportJson(item)}
                    icon={Icon.Code}
                    shortcut={{ modifiers: ["cmd"], key: "j" }}
                  />
                  <Action
                    title="Export All as JSON"
                    onAction={handleExportAllJson}
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                  />
                  <Action
                    title="Delete Item"
                    onAction={() => handleDelete(item)}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="History Management">
                  <Action
                    title="Refresh History"
                    onAction={loadHistory}
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Clear All History"
                    onAction={handleClearAll}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
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
