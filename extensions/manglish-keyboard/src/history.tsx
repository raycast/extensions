import { List, ActionPanel, Action, Clipboard, showHUD, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { getHistory, clearHistory, HistoryItem } from "./history-utils";

export default function HistoryCommand() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then((h) => {
      setItems(h);
      setLoading(false);
    });
  }, []);

  async function handleClear() {
    const confirmed = await confirmAlert({
      title: "Clear History",
      message: "Are you sure you want to clear all transliteration history?",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await clearHistory();
      setItems([]);
      await showHUD("History cleared");
    }
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search history...">
      {items.length === 0 && !loading && (
        <List.EmptyView title="No History Yet" description="Transliterations you make will appear here" />
      )}
      {items.map((item, index) => (
        <List.Item
          key={index}
          title={item.output}
          subtitle={item.input}
          accessories={[{ date: new Date(item.timestamp) }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Malayalam"
                onAction={async () => {
                  await Clipboard.copy(item.output);
                  await showHUD(`Copied: ${item.output}`);
                }}
              />
              <Action
                title="Copy Both"
                onAction={async () => {
                  await Clipboard.copy(`${item.input} = ${item.output}`);
                  await showHUD("Copied both");
                }}
              />
              <Action title="Clear All History" style={Action.Style.Destructive} onAction={handleClear} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
