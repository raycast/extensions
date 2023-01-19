import { Action, ActionPanel, Cache, List } from "@raycast/api";
import { useEffect, useState } from "react";
import type { Bookmark } from "./api";

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
        return bookmark.description.toLowerCase().includes(searchText);
      })
    );
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Beers"
      searchBarPlaceholder="Search your favorite beer"
    >
      {filteredBookmarks.map((bookmark) => (
        <List.Item
          key={bookmark.hash}
          title={bookmark.description}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => console.log(`${bookmark.description} selected`)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
