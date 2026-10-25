import { ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { favicon, OpenActions, useYabWindow } from "./components";
import { bookmarks, domainOf } from "./data";

export default function Command() {
  const items = useMemo(() => bookmarks(), []);
  const { data: window } = useYabWindow({ launch: false });
  return (
    <List searchBarPlaceholder="Search bookmarks…">
      <List.EmptyView icon={Icon.Bookmark} title="No bookmarks" description="Yab's bookmarks bar shows here." />
      {items.map((b) => (
        <List.Item
          key={b.id}
          icon={favicon(b.url)}
          title={b.title}
          subtitle={b.path.length ? b.path.join(" › ") : domainOf(b.url)}
          keywords={[b.url, domainOf(b.url), ...b.path]}
          accessories={b.path.length ? [{ text: domainOf(b.url) }] : []}
          actions={
            <ActionPanel>
              <OpenActions url={b.url} title={b.title} tabs={window?.tabs} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
