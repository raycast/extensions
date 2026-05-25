import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { HistoryEntry } from "../../utils/update-history";
import { SOURCE_META } from "../../utils/source-meta";
import { dayLabel, timeOfDay } from "../../utils/format";

interface Props {
  history: HistoryEntry[];
  onRefresh: () => void;
}

/** Bucketed-by-day list of past updates. Read-only — the actions are just navigation helpers. */
export default function HistoryView({ history, onRefresh }: Props) {
  if (history.length === 0) {
    return (
      <List.EmptyView
        icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
        title="No update history yet"
        description="Apps and packages you update through Mac Updater appear here · the last 500 are kept."
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.RotateClockwise}
              onAction={onRefresh}
            />
            <Action
              title="Configure Auto-Update…"
              icon={Icon.Cog}
              onAction={() => openExtensionPreferences()}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Bucket by day for readability
  const byDay = new Map<string, HistoryEntry[]>();
  for (const e of history) {
    const day = dayLabel(e.at);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(e);
  }

  return (
    <>
      {Array.from(byDay.entries()).map(([day, entries]) => (
        <List.Section key={day} title={day} subtitle={`${entries.length}`}>
          {entries.map((e, i) => {
            const meta = SOURCE_META[e.source];
            return (
              <List.Item
                key={`${day}-${i}`}
                icon={{ source: meta.icon, tintColor: meta.color }}
                title={e.name}
                subtitle={
                  e.fromVersion && e.toVersion
                    ? `${e.fromVersion} → ${e.toVersion}`
                    : (e.toVersion ?? "")
                }
                accessories={[
                  { tag: { value: meta.label, color: meta.color } },
                  {
                    text: timeOfDay(e.at),
                    tooltip: new Date(e.at).toLocaleString(),
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      onAction={onRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Bundle ID"
                      content={e.bundleId ?? ""}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </>
  );
}
