import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { TabItem } from "./tab-item";
import { getTabs, Tab } from "./yab";

export default function Command() {
  const { data = [], isLoading, revalidate, error } = useCachedPromise(getTabs);
  const bySpace = new Map<string, Tab[]>();
  for (const t of data) bySpace.set(t.spaceTitle, [...(bySpace.get(t.spaceTitle) ?? []), t]);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tabs">
      {error && <List.EmptyView title="Could not read Yab tabs" description={error.message} />}
      {[...bySpace].map(([space, tabs]) => (
        <List.Section key={space} title={space || "Tabs"} subtitle={String(tabs.length)}>
          {tabs.map((t) => (
            <TabItem key={t.id} tab={t} onChange={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
