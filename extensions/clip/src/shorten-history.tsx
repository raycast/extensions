import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ShortenResult } from "./types";
import { getHistory, removeFromHistory, clearHistory } from "./storage/history";

export default function ShortenHistory() {
  const [history, setHistory] = useState<ShortenResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadHistory() {
    setIsLoading(true);
    const entries = await getHistory();
    setHistory(entries);
    setIsLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleDelete(shortUrl: string) {
    await removeFromHistory(shortUrl);
    await loadHistory();
    await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "This will permanently delete all shortened URL history.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await clearHistory();
    await loadHistory();
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  return (
    <List isLoading={isLoading}>
      {history.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No shortened URLs yet"
          description="Use the Shorten URL command to get started"
        />
      ) : (
        history.map((entry) => (
          <List.Item
            key={entry.shortUrl}
            title={entry.originalUrl}
            subtitle={entry.shortUrl}
            icon={Icon.Link}
            accessories={[
              { text: entry.service },
              { date: new Date(entry.createdAt) },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Short URL"
                  content={entry.shortUrl}
                />
                <Action.OpenInBrowser url={entry.shortUrl} />
                <Action.CopyToClipboard
                  title="Copy Original URL"
                  content={entry.originalUrl}
                />
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  onAction={() => handleDelete(entry.shortUrl)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleClearAll}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
