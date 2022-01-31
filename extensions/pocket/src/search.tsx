import { ActionPanel, CopyToClipboardAction, Icon, List, OpenInBrowserAction } from "@raycast/api";
import { useBookmarks } from "./utils/hooks";
import { useState } from "react";

export default function Command() {
  const [search, setSearch] = useState("");
  const { bookmarks, loading } = useBookmarks({ search });

  return (
    <List isLoading={loading} onSearchTextChange={setSearch} throttle searchBarPlaceholder="Filter by title...">
      {bookmarks.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          icon={bookmark.type === "article" ? Icon.TextDocument : Icon.Video}
          subtitle={bookmark.tags.length > 0 ? `#${bookmark.tags.join(" #")}` : ""}
          title={bookmark.title}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <OpenInBrowserAction title="Open in Browser" url={bookmark.url} />
                <OpenInBrowserAction title="Open in Pocket" url={`https://getpocket.com/read/${bookmark.id}`} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CopyToClipboardAction title="Copy Bookmark URL" content={bookmark.url} />
                <CopyToClipboardAction title="Copy Bookmark Title" content={bookmark.title} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
