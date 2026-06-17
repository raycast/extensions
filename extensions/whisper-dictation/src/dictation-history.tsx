import { ActionPanel, Action, List, LocalStorage, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useCallback, useEffect } from "react";

interface TranscriptionHistoryItem {
  id: string;
  timestamp: number;
  text: string;
}

const HISTORY_STORAGE_KEY = "dictationHistory";

export default function DictationHistoryCommand() {
  const [history, setHistory] = useState<TranscriptionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history directly from LocalStorage
  useEffect(() => {
    async function loadHistory() {
      try {
        const rawData = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
        console.log(`history command: found ${rawData ? "data" : "no data"} in localstorage`);

        if (rawData) {
          const parsedData = JSON.parse(rawData);
          if (Array.isArray(parsedData)) {
            console.log(`History Command: Parsed history length: ${parsedData.length}`);
            setHistory(parsedData);
          } else {
            console.error("History data is not an array, resetting");
            setHistory([]);
          }
        } else {
          setHistory([]);
          console.log("History Command: No history found in LocalStorage");
        }
      } catch (error) {
        console.error("Error loading history:", error);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, []);

  // Save history changes back to LocalStorage
  useEffect(() => {
    if (!isLoading) {
      LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
        .then(() => console.log(`Saved updated history with ${history.length} items`))
        .catch((error) => showFailureToast(error, { title: "Could not save history" }));
    }
  }, [history, isLoading]);

  // Function to delete a specific item
  const deleteItem = useCallback(async (idToDelete: string) => {
    if (
      await confirmAlert({
        title: "Delete Transcription?",
        message: "Are you sure you want to delete this transcription from history? This cannot be undone.",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setHistory((prevHistory) => prevHistory.filter((item) => item.id !== idToDelete));
      await showToast(Toast.Style.Success, "Item Deleted");
      console.log(`Deleted history item with ID: ${idToDelete}`);
    }
  }, []);

  // Function to delete all items
  const deleteAllItems = useCallback(async () => {
    if (
      await confirmAlert({
        title: "Delete All History?",
        message: "Are you sure you want to delete all transcriptions from history? This cannot be undone.",
        primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setHistory([]);
      await showToast(Toast.Style.Success, "History Cleared");
      console.log("Deleted all history items.");
    }
  }, []);

  // Function to escape Markdown characters for safe display
  const escapeMarkdown = (text: string) => {
    return text.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
  };

  // Sort history by timestamp (newest first)
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading && sortedHistory.length > 0}
      searchBarPlaceholder="Search transcription history..."
    >
      {!isLoading && sortedHistory.length === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title="No Dictation History"
          description="Transcriptions will appear here after you use the 'Dictate Text' command."
        />
      ) : (
        sortedHistory.map((item) => {
          const date = new Date(item.timestamp);
          const formattedDate = date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <List.Item
              key={item.id}
              title={item.text.substring(0, 70) + (item.text.length > 70 ? "..." : "")}
              accessories={[{ text: formattedDate }]}
              detail={
                <List.Item.Detail
                  markdown={escapeMarkdown(item.text)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label icon={Icon.Clock} title="Transcribed On" text={formattedDate} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        icon={Icon.Text}
                        title="Characters"
                        text={item.text.length.toString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Transcription">
                    <Action.CopyToClipboard
                      title="Copy Text"
                      icon={Icon.Clipboard}
                      content={item.text}
                      shortcut={{ modifiers: [], key: "enter" }}
                    />
                    <Action.Paste
                      title="Paste Text"
                      icon={Icon.Clipboard}
                      content={item.text}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage History">
                    <Action
                      title="Delete Item"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => deleteItem(item.id)}
                    />
                    <Action
                      title="Delete All History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      onAction={deleteAllItems}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
