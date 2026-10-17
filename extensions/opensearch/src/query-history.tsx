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
import { clearHistory, listHistory, removeHistory, setFavorite, type HistoryEntry } from "./lib/history";
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
    // Only the preferences fallback entry may resolve to the preferences connection.
    // A saved connection that was deleted must NOT silently redirect to a different cluster.
    if (entry.connectionId === "preferences") return connectionFromPreferences();
    return connections.find((c) => c.id === entry.connectionId);
  }

  // Re-checks storage right before running a request, since the cached `connections`
  // list can go stale if another Raycast window deletes the connection while this
  // view stays open.
  async function resolveConnectionFresh(entry: HistoryEntry): Promise<Connection | undefined> {
    if (entry.connectionId === "preferences") return connectionFromPreferences();
    const fresh = await listConnections();
    return fresh.find((c) => c.id === entry.connectionId);
  }

  function renderItem(entry: HistoryEntry) {
    const connection = resolveConnection(entry);
    return (
      <List.Item
        key={entry.id}
        icon={entry.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Clock}
        title={`${entry.method} ${entry.path}`}
        subtitle={entry.body ? "has body" : undefined}
        accessories={[
          { tag: entry.status ? String(entry.status) : "—" },
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
                onAction={async () => {
                  const fresh = await resolveConnectionFresh(entry);
                  if (!fresh) {
                    await showToast({ style: Toast.Style.Failure, title: "Connection no longer exists" });
                    revalidate();
                    return;
                  }
                  push(<ResultView connection={fresh} method={entry.method} path={entry.path} body={entry.body} />);
                }}
              />
            )}
            <Action
              title={entry.favorite ? "Remove Favorite" : "Add Favorite"}
              icon={Icon.Star}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={async () => {
                await setFavorite(entry.id, !entry.favorite);
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
      <List.EmptyView title="No queries yet" description="Run a request to see it here." icon={Icon.Clock} />
      {favorites.length > 0 && <List.Section title="Favorites">{favorites.map(renderItem)}</List.Section>}
      <List.Section title="Recent">{recent.map(renderItem)}</List.Section>
    </List>
  );
}
