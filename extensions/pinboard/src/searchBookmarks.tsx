import { Cache, List } from "@raycast/api";
import { useEffect, useState } from "react";
import type { Bookmark } from "./api";
import { BookmarkListItem } from "./components";

export default function Command() {
  const pinboardCache = new Cache({
    namespace: "pinboard",
  });

  // What happens when it's empty? What should I do about it?
  const JSONbookmarks = pinboardCache.get("posts") as string;
  const bookmarks = JSON.parse(JSONbookmarks) as Bookmark[];

  const [searchText, setSearchText] = useState("");
  const [filteredBookmarks, filterBookmarks] = useState(bookmarks);

  useEffect(() => {
    filterBookmarks(
      bookmarks.filter((bookmark) => {
        console.log({ bookmark });
        return bookmark.title.toLowerCase().includes(searchText);
      })
    );
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Pins by Title"
      searchBarPlaceholder="Search by title..."
    >
      {filteredBookmarks.map((bookmark) => (
        <BookmarkListItem
          key={bookmark.id}
          bookmark={bookmark}
        />
      ))}
    </List>
  );
}
