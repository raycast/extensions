import { List } from "@raycast/api";
import Bookmark from "../dtos/bookmark-dto";
import { BookmarkGroup } from "../interfaces/bookmark-group";
import { GitStatusMap } from "../hooks/use-batch-git-status";
import BookmarkListItem from "./bookmark-list-item";

interface BookmarkListProps {
  groups: BookmarkGroup[];
  isLoading: boolean;
  pinnedIds: string[];
  recentIds: string[];
  isPinned: (id: string) => boolean;
  onTogglePin: (id: string) => void;
  onOpen: (id: string) => void;
  onClearRecent: (id: string) => void;
  gitStatusMap: GitStatusMap;
}

export default function BookmarkList(props: BookmarkListProps) {
  const { groups, isLoading, pinnedIds, recentIds, isPinned, onTogglePin, onOpen, onClearRecent, gitStatusMap } = props;

  const allBookmarks = groups.flatMap((g) => g.bookmarks);
  const pinnedBookmarks = pinnedIds
    .map((id) => allBookmarks.find((b) => b.id === id))
    .filter((b): b is Bookmark => b !== undefined);

  const recentBookmarks = recentIds
    .filter((id) => !pinnedIds.includes(id))
    .map((id) => allBookmarks.find((b) => b.id === id))
    .filter((b): b is Bookmark => b !== undefined);

  const renderItem = (bookmark: Bookmark, options?: { isRecent?: boolean; idPrefix?: string }) => (
    <BookmarkListItem
      key={options?.idPrefix ? `${options.idPrefix}-${bookmark.id}` : bookmark.id}
      bookmark={bookmark}
      idPrefix={options?.idPrefix}
      isPinned={isPinned(bookmark.id)}
      isRecent={options?.isRecent}
      onTogglePin={onTogglePin}
      onOpen={onOpen}
      onClearRecent={onClearRecent}
      gitStatus={gitStatusMap[bookmark.id]}
    />
  );

  return (
    <List searchBarPlaceholder="Search repo by name or branch..." isLoading={isLoading}>
      {pinnedBookmarks.length > 0 && (
        <List.Section title="Favorites" subtitle={`${pinnedBookmarks.length}`}>
          {pinnedBookmarks.map((b) => renderItem(b, { idPrefix: "pin" }))}
        </List.Section>
      )}
      {recentBookmarks.length > 0 && (
        <List.Section title="Recent" subtitle={`${recentBookmarks.length}`}>
          {recentBookmarks.map((b) => renderItem(b, { isRecent: true, idPrefix: "recent" }))}
        </List.Section>
      )}
      {groups.map((group) => (
        <List.Section key={group.id} title={group.name || "Repositories"} subtitle={`${group.bookmarks.length}`}>
          {group.bookmarks.map((b) => renderItem(b))}
        </List.Section>
      ))}
    </List>
  );
}
