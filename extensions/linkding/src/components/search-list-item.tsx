import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useMemo } from "react";
import { useBookmarksContext } from "../bookmarks-context";
import { LinkdingBookmark } from "../types/linkding-types";

interface Props {
  bookmark: LinkdingBookmark;
}

export const SearchListItem = ({ bookmark }: Props) => {
  const {
    sortByFrecency,
    onDeleteBookmark,
    onArchiveBookmark,
    onOpenBookmark,
    onCopyBookmark,
    onResetBookmark,
    getBookmarkMetadata,
  } = useBookmarksContext();
  const { title, subtitle, tags, editUrl } = useMemo(
    () => getBookmarkMetadata(bookmark),
    [getBookmarkMetadata, bookmark],
  );

  return (
    <List.Item
      icon={getFavicon(bookmark.url, { fallback: Icon.Globe })}
      title={title}
      subtitle={subtitle}
      accessories={tags}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={bookmark.url} onOpen={() => onOpenBookmark(bookmark)} />
            <Action.OpenInBrowser title="Edit in Linkding" url={editUrl} shortcut={Keyboard.Shortcut.Common.Edit} />
            <Action.CopyToClipboard
              content={bookmark.url}
              onCopy={() => onCopyBookmark(bookmark)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {sortByFrecency && (
              <Action
                onAction={() => onResetBookmark(bookmark)}
                icon={Icon.ArrowCounterClockwise}
                title="Reset Ranking"
              />
            )}

            <Action
              onAction={() => onArchiveBookmark(bookmark)}
              icon={Icon.Document}
              title="Archive"
              shortcut={{ modifiers: ["ctrl"], key: "a" }}
            />
            <Action
              onAction={() => onDeleteBookmark(bookmark)}
              icon={Icon.Trash}
              title="Delete"
              shortcut={Keyboard.Shortcut.Common.Remove}
              style={Action.Style.Destructive}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
