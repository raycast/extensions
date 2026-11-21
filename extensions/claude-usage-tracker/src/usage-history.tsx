import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { OpenClaudeUsageAction } from "./components/app-actions";
import { UsageErrorView } from "./components/use-usage";
import { averageUsed, readHistory } from "./lib/history";
import { loadUsage } from "./lib/store";
import { HistoryEntry } from "./lib/types";
import { limitIcon, severityColor } from "./lib/ui";

function entryDate(entry: HistoryEntry): string {
  return entry.at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function sectionSubtitle(entries: HistoryEntry[]): string {
  const average = averageUsed(entries);
  return average === undefined ? "" : `${entries.length} · ${average}% used on average`;
}

function HistoryItem(props: { entry: HistoryEntry }) {
  const { entry } = props;
  return (
    <List.Item
      title={entryDate(entry)}
      icon={limitIcon(entry.usedPercent, "used")}
      keywords={[entry.kind]}
      accessories={[
        ...entry.models.map((model) => ({ tag: `${model.title} ${Math.round(model.usedPercent)}%` })),
        { tag: { value: `${Math.round(entry.usedPercent)}% used`, color: severityColor(entry.usedPercent) } },
      ]}
      actions={
        <ActionPanel>
          <OpenClaudeUsageAction />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const profiles = useCachedPromise(loadUsage, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not read Claude Usage data" },
  });
  const [selected, setSelected] = useState<string>();
  const profileId = selected ?? profiles.data?.[0]?.profile;
  const history = useCachedPromise(readHistory, [profileId ?? ""], {
    execute: profileId !== undefined,
    keepPreviousData: true,
    failureToastOptions: { title: "Could not read the usage history" },
  });

  if (profiles.error && !profiles.data?.length) {
    return <UsageErrorView error={profiles.error} onReload={profiles.revalidate} />;
  }

  const entries = history.data ?? [];
  const weekly = entries.filter((entry) => entry.kind === "weekly");
  const sessions = entries.filter((entry) => entry.kind === "session");

  return (
    <List
      isLoading={profiles.isLoading || history.isLoading}
      searchBarPlaceholder="Filter resets"
      searchBarAccessory={
        (profiles.data?.length ?? 0) > 1 ? (
          <List.Dropdown tooltip="Profile" value={profileId} onChange={setSelected}>
            {profiles.data?.map((usage) => (
              <List.Dropdown.Item key={usage.profile} title={usage.name} value={usage.profile} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={history.error ? { source: Icon.Warning, tintColor: Color.Orange } : Icon.Clock}
        title={history.error ? "Could Not Read the History" : "No Resets Recorded Yet"}
        description={
          history.error
            ? history.error.message
            : "Claude Usage saves an entry each time a session or a week resets. Keep it running and check back later."
        }
        actions={
          <ActionPanel>
            <OpenClaudeUsageAction />
          </ActionPanel>
        }
      />
      <List.Section title="Weeks" subtitle={sectionSubtitle(weekly)}>
        {weekly.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} />
        ))}
      </List.Section>
      <List.Section title="5-Hour Sessions" subtitle={sectionSubtitle(sessions)}>
        {sessions.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} />
        ))}
      </List.Section>
    </List>
  );
}
