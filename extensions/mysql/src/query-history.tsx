import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { connectionFromPreferences, listConnections, type Connection } from "./lib/connections";
import { clearHistory, listHistory, removeHistory, toggleFavorite, type HistoryEntry } from "./lib/history";
import { ResultView } from "./views/result-view";

export default function QueryHistory() {
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = usePromise(async () => {
    const [entries, connections] = await Promise.all([listHistory(), listConnections()]);
    return { entries, connections };
  });

  const entries = data?.entries ?? [];
  const connections = data?.connections ?? [];
  const favorites = entries.filter((entry) => entry.favorite);
  const recent = entries.filter((entry) => !entry.favorite);

  function resolveConnection(entry: HistoryEntry): Connection | undefined {
    if (entry.connectionId === "preferences") return connectionFromPreferences();
    return connections.find((c) => c.id === entry.connectionId);
  }

  function renderItem(entry: HistoryEntry) {
    const connection = resolveConnection(entry);
    return (
      <List.Item
        key={entry.id}
        icon={entry.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Clock}
        title={entry.sql.replace(/\s+/g, " ").slice(0, 80)}
        accessories={[
          {
            icon: entry.ok
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.XMarkCircle, tintColor: Color.Red },
          },
          connection
            ? { text: entry.connectionName }
            : { tag: { value: entry.connectionName, color: Color.Red }, tooltip: "Connection no longer exists" },
        ]}
        actions={
          <ActionPanel>
            {connection && (
              <Action
                title="Run Again"
                icon={Icon.Bolt}
                onAction={() => push(<ResultView connection={connection} sql={entry.sql} />)}
              />
            )}
            <Action.CopyToClipboard title="Copy SQL" content={entry.sql} shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action
              title={entry.favorite ? "Remove Favorite" : "Add Favorite"}
              icon={Icon.Star}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={async () => {
                await toggleFavorite(entry.id);
                revalidate();
              }}
            />
            <ActionPanel.Section>
              <Action
                title="Delete Entry"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  await removeHistory(entry.id);
                  await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
                  revalidate();
                }}
              />
              <Action
                title="Clear History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                onAction={async () => {
                  if (await confirmAlert({ title: "Clear all history?" })) {
                    await clearHistory();
                    await showToast({ style: Toast.Style.Success, title: "History cleared" });
                    revalidate();
                  }
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search history…">
      <List.EmptyView title="No queries yet" description="Run a query to see it here." icon={Icon.Clock} />
      {favorites.length > 0 && <List.Section title="Favorites">{favorites.map(renderItem)}</List.Section>}
      <List.Section title="Recent">{recent.map(renderItem)}</List.Section>
    </List>
  );
}
