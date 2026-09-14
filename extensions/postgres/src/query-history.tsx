import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, confirmAlert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { clearHistory, listHistory, removeHistoryEntry, toggleFavorite, type HistoryEntry } from "./lib/history";
import { oneLine } from "./lib/format";
import RunQuery from "./run-query";

export default function QueryHistory() {
  const { data, isLoading, revalidate } = useCachedPromise(listHistory, []);
  const entries = data ?? [];
  const favorites = entries.filter((entry) => entry.favorite);
  const recent = entries.filter((entry) => !entry.favorite);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search statements…">
      <List.EmptyView
        icon={Icon.Clock}
        title="No queries yet"
        description="Statements you run — from a command or from Raycast AI — show up here."
      />
      <List.Section title="Favorites">
        {favorites.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} onChange={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Recent">
        {recent.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} onChange={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}

function HistoryItem({ entry, onChange }: { entry: HistoryEntry; onChange: () => void }) {
  return (
    <List.Item
      icon={
        entry.succeeded
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.XMarkCircle, tintColor: Color.Red }
      }
      title={oneLine(entry.sql)}
      subtitle={entry.outcome}
      accessories={[{ text: entry.connectionName }, { date: new Date(entry.ranAt), tooltip: `${entry.durationMs} ms` }]}
      actions={
        <ActionPanel>
          <Action.Push title="Run Again" icon={Icon.Play} target={<RunQuery draftSql={entry.sql} />} />
          <Action.CopyToClipboard title="Copy Statement" content={entry.sql} />
          <Action
            title={entry.favorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={async () => {
              await toggleFavorite(entry.id);
              onChange();
            }}
          />
          <Action
            title="Delete Entry"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              await removeHistoryEntry(entry.id);
              onChange();
            }}
          />
          <Action
            title="Clear History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Clear query history?",
                message: "Favorites are kept.",
                primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
              });
              if (!confirmed) return;
              await clearHistory();
              onChange();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
