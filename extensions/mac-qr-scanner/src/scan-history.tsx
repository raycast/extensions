import {
  List,
  Action,
  ActionPanel,
  Icon,
  showHUD,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  type HistoryEntry,
  getHistory,
  deleteFromHistory,
  clearHistory,
} from "./utils";
import { ScanResultDetail } from "./scan-result-detail";

export default function ScanHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    const entries = await getHistory();
    setHistory(entries);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleDelete(id: string) {
    await deleteFromHistory(id);
    await loadHistory();
    await showToast({ style: Toast.Style.Success, title: "Deleted" });
  }

  async function handleClearAll() {
    if (
      await confirmAlert({
        title: "Clear All History?",
        message: "This cannot be undone.",
        primaryAction: {
          title: "Clear All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await clearHistory();
      await loadHistory();
      await showHUD("History cleared");
    }
  }

  function iconForType(type: HistoryEntry["type"]): Icon {
    switch (type) {
      case "wifi":
        return Icon.Wifi;
      case "url":
        return Icon.Globe;
      case "text":
        return Icon.Document;
    }
  }

  function titleForEntry(entry: HistoryEntry): string {
    if (entry.type === "wifi" && entry.wifiNetwork) {
      return entry.wifiNetwork.ssid;
    }
    return entry.data;
  }

  function subtitleForEntry(entry: HistoryEntry): string {
    switch (entry.type) {
      case "wifi":
        return "Wi-Fi Network";
      case "url":
        return "URL";
      case "text":
        return "Text";
    }
  }

  return (
    <List isLoading={isLoading}>
      {history.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Scan History"
          description="QR codes you scan will appear here."
        />
      ) : null}
      {history.map((entry) => (
        <List.Item
          key={entry.id}
          id={entry.id}
          icon={iconForType(entry.type)}
          title={titleForEntry(entry)}
          subtitle={subtitleForEntry(entry)}
          accessories={[
            {
              date: new Date(entry.timestamp),
              tooltip: new Date(entry.timestamp).toLocaleString(),
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={<ScanResultDetail data={entry.data} />}
              />
              <Action
                title="Scan New QR Code"
                icon={Icon.Camera}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={async () => {
                  await launchCommand({
                    name: "scan-qr-code",
                    type: LaunchType.UserInitiated,
                  });
                }}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(entry.id)}
              />
              <Action
                title="Clear All History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                onAction={handleClearAll}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
