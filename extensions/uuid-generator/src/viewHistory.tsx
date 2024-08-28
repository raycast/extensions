import { ActionPanel, List, Action, getPreferenceValues, Clipboard, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { getHistory as fetchHistory, clearHistory as clearStoredHistory, deleteHistoryEntry } from "./uuidHistory";
import { HistoryEntry } from "./uuidHistory";

interface Preferences {
  defaultAction: string;
}

export default function ViewHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    async function loadHistory() {
      const historyData = await fetchHistory();
      setHistory(historyData);
    }

    loadHistory();
  }, []);

  const clearHistory = async () => {
    clearStoredHistory();
    setHistory([]); // Clear the history state after clearing the stored history
  };

  const deleteEntry = async (uuid: string) => {
    const updatedHistory = await deleteHistoryEntry(uuid);
    setHistory(updatedHistory); // Update the state with the history after deletion
  };

  const copyOrPasteAllUUIDs = async () => {
    const { defaultAction } = getPreferenceValues<Preferences>();
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
      {history.map((entry, index) => (
        <List.Item
          key={index}
          title={entry.uuid}
          subtitle={`${entry.type} | ${new Date(entry.timestamp).toLocaleString()}`} // Display type and timestamp
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={entry.uuid} />
              <Action title="Delete Entry" onAction={() => deleteEntry(entry.uuid)} />
              <Action title="Clear History" onAction={clearHistory} />
              <Action title="Copy or Paste All UUIDs" onAction={copyOrPasteAllUUIDs} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
