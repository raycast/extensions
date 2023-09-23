import { List, ActionPanel, Action, Cache } from "@raycast/api";
import { BOOKMARKS } from "./constants";
import { Bookmark } from "./interfaces";
import { recordInteraction } from "./support";

export function Search(cache: Cache) {
  const cached = cache.get(BOOKMARKS);
  const items = cached ? JSON.parse(cached) : [];

  return (
    <List>
      {items.map((item: Bookmark) => (
        <List.Item
          key={item.id}
          actions={
            <ActionPanel title={item.name}>
              <Action.OpenInBrowser url={item.url} onOpen={(url) => recordInteraction(url)} />
              <Action.CopyToClipboard title="Copy Link" content={item.url} />
            </ActionPanel>
          }
          icon={item.favicon}
          subtitle={item.description}
          title={item.name}
        />
      ))}
    </List>
  );
}
