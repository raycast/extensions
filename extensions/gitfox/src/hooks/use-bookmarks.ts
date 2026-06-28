import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { fetchBookmarkGroups } from "../utils";
import { BookmarkGroup } from "../interfaces/bookmark-group";
import Bookmark from "../dtos/bookmark-dto";

function reconstitute(groups: BookmarkGroup[]): BookmarkGroup[] {
  return groups.map((group) => ({
    ...group,
    bookmarks: group.bookmarks.map((b) => {
      if (b instanceof Bookmark) return b;
      const plain = b as unknown as { folder: string; name: string; id: string; type: number; children: Bookmark[] };
      return new Bookmark(plain.folder, plain.name, plain.id, plain.type, plain.children);
    }),
  }));
}

export function useBookmarks() {
  const result = useCachedPromise(fetchBookmarkGroups, [], {
    keepPreviousData: true,
  });

  const groups = useMemo(() => reconstitute(result.data ?? []), [result.data]);

  return { ...result, data: groups };
}
