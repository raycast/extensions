import {
  ActionPanel,
  List,
  Action,
  getPreferenceValues,
  Clipboard,
  showToast,
  Toast,
  Icon,
  confirmAlert,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { getHistory as fetchHistory, clearHistory as clearStoredHistory, deleteHistoryEntry } from "./uuidHistory";
import { HistoryEntry } from "./uuidHistory";

export default function ViewHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const { defaultAction } = getPreferenceValues<Preferences.ViewHistory>();

  useEffect(() => {
    async function loadHistory() {
      const historyData = await fetchHistory();
      const reversedHistoryData = historyData.reverse();
      setHistory(reversedHistoryData);
    }

    loadHistory();
  }, []);

  const clearHistory = async () => {
    await confirmAlert({
      title: "Clear History",
      icon: Icon.Trash,
      message: "You can't undo this action. Are you sure you want to clear the history?",
      primaryAction: {
        title: "Clear History",
        onAction: () => {
          clearStoredHistory();
          setHistory([]); // Clear the history state after clearing the stored history
        },
      },
    });
  };

  const deleteEntry = async (uuid: string) => {
    const updatedHistory = await deleteHistoryEntry(uuid);
    setHistory(updatedHistory); // Update the state with the history after deletion
  };

  const copyOrPasteAllUUIDs = async () => {
    const allUUIDs = history.map((entry) => entry.uuid).join("\r\n"); // Join all UUIDs with newline

    if (defaultAction === "copy") {
      await Clipboard.copy(allUUIDs);
      showToast(Toast.Style.Success, "Copied all UUIDs to clipboard.");
    } else if (defaultAction === "paste") {
      await Clipboard.paste(allUUIDs);
      showToast(Toast.Style.Success, "Pasted all UUIDs.");
    }
  };

  return (
    <List>
      {history.map((entry, index) => {
        const date = new Date(entry.timestamp);

        return (
          <List.Item
            key={index}
            title={entry.uuid}
            accessories={[
              { tag: entry.type, tooltip: "Type", icon: Icon.Tag },
              { date: date, tooltip: date.toLocaleString(), icon: Icon.Clock },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={entry.uuid} />
                <Action
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title={`${defaultAction === "copy" ? "Copy" : "Paste"} All UUIDs`}
                  icon={Icon.Clipboard}
                  onAction={copyOrPasteAllUUIDs}
                />
                <ActionPanel.Section>
                  <Action
                    title="Delete Entry"
                    onAction={() => deleteEntry(entry.uuid)}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                  <Action
                    title="Clear History"
                    onAction={clearHistory}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
