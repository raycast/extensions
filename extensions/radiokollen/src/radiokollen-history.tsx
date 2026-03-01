import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  clearHistory,
  loadHistory,
  removeHistoryItem,
  type HistoryItem,
} from "./history-storage";
import { SearchResultsView } from "./search-results-view";
import { formatHistoryTimestamp, queryToSummary } from "./shared";

export function RadiokollenHistoryCommand() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);

      try {
        const history = await loadHistory();
        if (!active) {
          return;
        }

        setItems(history);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function handleRemoveItem(item: HistoryItem) {
    const confirmed = await confirmAlert({
      title: "Ta bort historikpost?",
      message: queryToSummary(item.query),
      primaryAction: {
        title: "Ta bort",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const next = await removeHistoryItem(item.id);
    setItems(next);

    await showToast({
      style: Toast.Style.Success,
      title: "Historikpost borttagen",
    });
  }

  async function handleClearHistory() {
    const confirmed = await confirmAlert({
      title: "Rensa hela historiken?",
      message: "Detta tar bort alla sparade sökningar.",
      primaryAction: {
        title: "Rensa",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await clearHistory();
    setItems([]);

    await showToast({
      style: Toast.Style.Success,
      title: "Historiken rensad",
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Sök i historiken...">
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={queryToSummary(item.query)}
          subtitle={`Sparad ${formatHistoryTimestamp(item.savedAt)}`}
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action.Push
                title="Kör Sökning"
                target={<SearchResultsView query={item.query} />}
              />
              <Action
                title="Ta Bort Historikpost"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void handleRemoveItem(item)}
              />
              <Action
                title="Rensa Hela Historiken"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void handleClearHistory()}
              />
              <Action.CopyToClipboard
                title="Kopiera Sökfråga (JSON)"
                content={JSON.stringify(item.query, null, 2)}
              />
            </ActionPanel>
          }
        />
      ))}

      {!isLoading && items.length === 0 ? (
        <List.EmptyView
          title="Ingen historik ännu"
          description="Kör en sökning i kommandot 'Sök Radiokollen' så sparas den här."
          actions={
            <ActionPanel>
              <Action
                title="Rensa Historik"
                style={Action.Style.Destructive}
                onAction={() => void handleClearHistory()}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

export default function Command() {
  return <RadiokollenHistoryCommand />;
}
