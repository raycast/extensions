import {
  Action,
  ActionPanel,
  List,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { HistoryItem } from "../types";
import { ResultView } from "./ResultView";

// Load history from storage
async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const history = await LocalStorage.getItem("clipyai_history");
    if (history && typeof history === "string") {
      return JSON.parse(history);
    }
    return [];
  } catch (error) {
    console.error("Error loading history:", error);
    return [];
  }
}

// Save history to storage
async function saveHistory(history: HistoryItem[]): Promise<void> {
  try {
    await LocalStorage.setItem("clipyai_history", JSON.stringify(history));
  } catch (error) {
    console.error("Error saving history:", error);
  }
}

export function HistoryView() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push, pop } = useNavigation();

  const loadHistoryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await loadHistory();
      // Filter out any invalid items
      const validData = data.filter(
        (item) => item && item.hotkey && item.hotkey.title && item.result && item.clipboardData,
      );
      setHistory(validData.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error("Error loading history:", error);
      setHistory([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  const clearHistory = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Clear History",
      message: "Are you sure you want to clear all history?",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await saveHistory([]);
      setHistory([]);
      showToast({
        style: Toast.Style.Success,
        title: "History cleared",
      });
    }
  }, []);

  const openResult = useCallback(
    (item: HistoryItem) => {
      push(<ResultView result={item.result} clipboardData={item.clipboardData} hotkey={item.hotkey} />);
    },
    [push],
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history..."
      actions={
        <ActionPanel>
          <Action title="Clear History" icon={Icon.Trash} style={Action.Style.Destructive} onAction={clearHistory} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    >
      {history.map((item) => (
        <List.Item
          key={item.id}
          title={item.hotkey.title}
          subtitle={formatDate(item.timestamp)}
          accessories={[{ text: `${item.result.length} chars` }]}
          icon={item.hotkey.icon}
          actions={
            <ActionPanel>
              <Action title="Open Result" icon={Icon.Eye} onAction={() => openResult(item)} />
              <Action.CopyToClipboard title="Copy Result" content={item.result} />
              <Action
                title="Clear History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={clearHistory}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
