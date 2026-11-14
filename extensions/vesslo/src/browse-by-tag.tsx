import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import { useMemo } from "react";
import { SharedAppListItem } from "./components/SharedAppListItem";
import {
  DataStateNotice,
  ReloadDataAction,
} from "./components/DataStateNotice";
import { useVessloData } from "./utils/useVessloData";
import { installedApps } from "./utils/app-policy";
import { countLabel, displayText } from "./utils/display-format";

export function TaggedApps({ tag }: { tag: string }) {
  const { data, isLoading, state, refresh } = useVessloData();
  const apps = installedApps(data?.apps ?? []).filter((app) =>
    app.tags.includes(tag),
  );
  return (
    <List
      isLoading={isLoading}
      navigationTitle={`#${displayText(tag, 120)}`}
      searchBarPlaceholder={`Search in #${displayText(tag, 80)}...`}
      actions={
        <ActionPanel>
          <ReloadDataAction refresh={refresh} />
        </ActionPanel>
      }
    >
      <DataStateNotice state={state} refresh={refresh} />
      {state.status === "ready" && apps.length === 0 && (
        <List.EmptyView
          icon={Icon.Tag}
          title="No Apps with This Tag"
          description="Return to the tag list to choose another tag."
        />
      )}
      <List.Section
        title={`#${displayText(tag, 120)} (${countLabel(apps.length)})`}
      >
        {apps.map((app) => (
          <SharedAppListItem
            key={app.id}
            app={app}
            state={state}
            onRefresh={refresh}
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function BrowseByTag() {
  const { data, isLoading, state, refresh } = useVessloData();
  const tagGroups = useMemo(() => {
    const counts = new Map<string, number>();
    installedApps(data?.apps ?? []).forEach((app) => {
      new Set(app.tags).forEach((tag) =>
        counts.set(tag, (counts.get(tag) ?? 0) + 1),
      );
    });
    return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
      (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
    );
  }, [data]);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tags..."
      actions={
        <ActionPanel>
          <ReloadDataAction refresh={refresh} />
        </ActionPanel>
      }
    >
      <DataStateNotice state={state} refresh={refresh} />
      {state.status === "ready" && tagGroups.length === 0 && (
        <List.EmptyView
          icon={Icon.Tag}
          title="No Tags Found"
          description="Add tags to your apps in Vesslo."
        />
      )}
      <List.Section title={`Tags (${tagGroups.length})`}>
        {tagGroups.map(({ tag, count }) => (
          <List.Item
            key={tag}
            id={tag}
            icon={{ source: Icon.Tag, tintColor: Color.Purple }}
            title={`#${displayText(tag, 160)}`}
            accessories={[{ text: countLabel(count) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Apps"
                  icon={Icon.List}
                  target={<TaggedApps tag={tag} />}
                />
                <ReloadDataAction refresh={refresh} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
