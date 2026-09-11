import { List } from "@raycast/api";
import { useState, useMemo } from "react";
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

function matchesSearch(bookmark: Bookmark, query: string): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();
  return (
    bookmark.name.toLowerCase().includes(lower) ||
    bookmark.getBranch.name.toLowerCase().includes(lower) ||
    bookmark.getPath.toLowerCase().includes(lower)
  );
}

export default function BookmarkList(props: BookmarkListProps) {
  const { groups, isLoading, pinnedIds, recentIds, isPinned, onTogglePin, onOpen, onClearRecent, gitStatusMap } = props;
  const [searchText, setSearchText] = useState("");

  const allBookmarks = useMemo(() => groups.flatMap((g) => g.bookmarks), [groups]);

  const { filteredPinned, filteredRecent, filteredGroups } = useMemo(() => {
    const seenPaths = new Set<string>();

    const filteredPinned = pinnedIds
      .map((id) => allBookmarks.find((b) => b.id === id))
      .filter((b): b is Bookmark => {
        if (!b || !matchesSearch(b, searchText)) return false;
        if (seenPaths.has(b.folder)) return false;
        seenPaths.add(b.folder);
        return true;
      });

    const filteredRecent = recentIds
      .filter((id) => !pinnedIds.includes(id))
      .map((id) => allBookmarks.find((b) => b.id === id))
      .filter((b): b is Bookmark => {
        if (!b || !matchesSearch(b, searchText)) return false;
        if (seenPaths.has(b.folder)) return false;
        seenPaths.add(b.folder);
        return true;
      });

    const filteredGroups = groups.map((group) => ({
      ...group,
      bookmarks: group.bookmarks.filter((b) => {
        if (seenPaths.has(b.folder) || !matchesSearch(b, searchText)) return false;
        seenPaths.add(b.folder);
        return true;
      }),
    }));

    return { filteredPinned, filteredRecent, filteredGroups };
  }, [pinnedIds, recentIds, allBookmarks, groups, searchText]);

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
    <List
      searchBarPlaceholder="Search repo by name or branch..."
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {filteredPinned.length > 0 && (
        <List.Section title="Favorites" subtitle={`${filteredPinned.length}`}>
          {filteredPinned.map((b) => renderItem(b, { idPrefix: "pin" }))}
        </List.Section>
      )}
      {filteredRecent.length > 0 && (
        <List.Section title="Recent" subtitle={`${filteredRecent.length}`}>
          {filteredRecent.map((b) => renderItem(b, { isRecent: true, idPrefix: "recent" }))}
        </List.Section>
      )}
      {filteredGroups.map((group) =>
        group.bookmarks.length > 0 ? (
          <List.Section key={group.id} title={group.name || "Repositories"} subtitle={`${group.bookmarks.length}`}>
            {group.bookmarks.map((b) => renderItem(b))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}
