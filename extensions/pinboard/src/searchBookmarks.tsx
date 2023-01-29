import { Cache, List } from "@raycast/api";
import { useEffect, useMemo } from "react";
import { refreshCache } from "./api";
import type { Bookmark } from "./api";
import { BookmarkListItem } from "./components";

export default function SearchBookmarks() {
  const pinboardCache = new Cache({
    namespace: "pinboard",
  });

  const JSONbookmarks = pinboardCache.get("bookmarks") as string;
  const bookmarks = useMemo(() => (JSONbookmarks ? (JSON.parse(JSONbookmarks) as Bookmark[]) : []), [JSONbookmarks]);

  useEffect(() => {
    // When we run this, if the cache is empty, let's fill it.
    // Is there any way to get this to update the UI?
    if (!JSONbookmarks) {
      refreshCache();
    }
  }, [JSONbookmarks]);

  return (
    <List navigationTitle="Search bookmarks by title" searchBarPlaceholder="Search by title...">
      {bookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.id} bookmark={bookmark} />
      ))}
    </List>
  );
}
