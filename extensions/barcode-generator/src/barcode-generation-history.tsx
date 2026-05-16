import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  BarcodeHistoryDetail,
  BarcodeHistoryEntry,
  BarcodePreview,
  clearHistoryEntries,
  formatHistoryTimestamp,
  getHistoryEntries,
} from "./barcode-components";

export default function Command() {
  const [entries, setEntries] = useState<BarcodeHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setIsLoading(true);
    const historyEntries = await getHistoryEntries();
    setEntries(historyEntries);
    setIsLoading(false);
  }

  async function handleClearHistory() {
    await clearHistoryEntries();
    setEntries([]);
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search barcode history">
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Barcode History Yet"
          description="Generate a 1D or 2D barcode and it will show up here."
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadEntries} />
            </ActionPanel>
          }
        />
      ) : null}

      {entries.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.text}
          subtitle={entry.barcodeType.title}
          accessories={[{ text: entry.kind }, { text: formatHistoryTimestamp(entry.createdAt) }]}
          detail={
            <BarcodeHistoryDetail
              kind={entry.kind}
              barcodeType={entry.barcodeType}
              text={entry.text}
              createdAt={entry.createdAt}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Barcode"
                target={
                  <BarcodePreview
                    kind={entry.kind}
                    barcodeType={entry.barcodeType}
                    text={entry.text}
                    saveToHistory={false}
                  />
                }
              />
              <Action title="Refresh" onAction={loadEntries} />
              <Action
                title="Clear History"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={handleClearHistory}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
