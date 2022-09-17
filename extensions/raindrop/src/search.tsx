import { List, showToast, Toast } from "@raycast/api";
import { ReactElement, useState } from "react";
import BookmarkItem from "./components/BookmarkItem";
import { useBookmarksSearch } from "./utils";
import { Bookmark } from "./types";

export default function Main(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { response, error, isLoading } = useBookmarksSearch(searchText);

  if (error) {
    showToast(Toast.Style.Failure, "Cannot search bookmark", error);
  }

  // operators help: https://help.raindrop.io/using-search#operators
  return (
    <List
      searchBarPlaceholder="Search bookmarks using Raindrop.io operators..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle
    >
      {response?.items?.map((bookmark: Bookmark) => (
        <BookmarkItem key={bookmark._id} bookmark={bookmark} />
      ))}
    </List>
  );
}
