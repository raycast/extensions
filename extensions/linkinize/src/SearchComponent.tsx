import { Action, ActionPanel, List, LaunchType, launchCommand } from "@raycast/api";
import { useEffect, useState } from "react";
import { Bookmark } from "./interfaces";
import { authenticationCheck, getCachedBookmarks, performSync, recordInteraction } from "./support";

export function Search() {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const authenticated = await authenticationCheck();
      if (!authenticated) {
        if (!canceled) {
          setIsLoading(false);
        }
        return;
      }
      let bookmarks = getCachedBookmarks();
      if (bookmarks.length === 0) {
        await performSync();
        bookmarks = getCachedBookmarks();
      }
      if (!canceled) {
        setItems(bookmarks);
        setIsLoading(false);
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Linkinize bookmarks">
      <List.EmptyView
        title="No bookmarks yet"
        description="Sync to load your active workspace bookmarks."
        actions={
          <ActionPanel>
            <Action
              title="Synchronize"
              onAction={() => launchCommand({ name: "synchronize", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
      {items
        .sort((a: Bookmark, b: Bookmark) => b.weight - a.weight)
        .map((item: Bookmark) => (
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
