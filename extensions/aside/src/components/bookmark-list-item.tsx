import { ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import type { ReactNode } from "react";
import type { Bookmark } from "../lib/types";
import { OpenBookmarkAction, OpenInDefaultBrowserAction, UrlActions } from "./actions";

interface BookmarkListItemProps {
  bookmark: Bookmark;
  onOpen: () => Promise<void> | void;
  additionalActions?: ReactNode;
}

export function BookmarkListItem({ bookmark, onOpen, additionalActions }: BookmarkListItemProps) {
  const displayTitle = bookmark.title || bookmark.url;

  return (
    <List.Item
      id={`bookmark-${bookmark.id}`}
      icon={getFavicon(bookmark.url, { fallback: Icon.Bookmark })}
      title={displayTitle}
      subtitle={bookmark.url}
      accessories={bookmark.folder ? [{ icon: Icon.Folder, text: bookmark.folder }] : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenBookmarkAction bookmark={bookmark} onOpen={onOpen} />
            <OpenInDefaultBrowserAction url={bookmark.url} onOpen={onOpen} />
          </ActionPanel.Section>
          <UrlActions url={bookmark.url} title={displayTitle} />
          {additionalActions}
        </ActionPanel>
      }
    />
  );
}
