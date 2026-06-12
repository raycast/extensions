import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchType,
  List,
  getPreferenceValues,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { HistoryEntry, Preferences } from "./types";
import { getHistory, clearHistory, removeFromHistory } from "./utils/history";
import { buildMarkdown } from "./utils/markdown";

export default function History() {
  const { plan } = getPreferenceValues<Preferences>();
  const isPaid = plan === "paid";
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getHistory().then((h) => {
      setHistory(h);
      setIsLoading(false);
    });
  }, []);

  async function handleClearAll() {
    await clearHistory();
    setHistory([]);
    showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  async function handleRemove(query: string) {
    const updated = await removeFromHistory(query);
    setHistory(updated);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search history..."
      navigationTitle="IP Lookup History"
    >
      {history.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No History"
          description="Lookup an IP or domain to get started"
          icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
        />
      ) : (
        history.map((entry) => (
          <List.Item
            key={entry.query + entry.timestamp}
            icon={entry.data.location.country_emoji}
            title={entry.query}
            subtitle={`${entry.data.location.city}, ${entry.data.location.country_name}`}
            accessories={[{ text: new Date(entry.timestamp).toLocaleString() }]}
            detail={
              <List.Item.Detail markdown={buildMarkdown(entry.data, isPaid)} />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy IP"
                  content={entry.data.ip}
                />
                <Action.OpenInBrowser
                  // eslint-disable-next-line @raycast/prefer-title-case -- "ipgeolocation.io" is a lowercase brand name
                  title="Open on ipgeolocation.io"
                  url={`https://ipgeolocation.io/ip-location/${entry.data.ip}`}
                />
                <Action
                  title="Re-Lookup This Entry"
                  icon={Icon.ArrowClockwise}
                  onAction={() =>
                    launchCommand({
                      name: "lookup-ip",
                      type: LaunchType.UserInitiated,
                      arguments: { query: entry.query },
                    })
                  }
                />
                <Action
                  title="Remove This Entry"
                  icon={Icon.Minus}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemove(entry.query)}
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
