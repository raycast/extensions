import { List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { useCachedState } from "@raycast/utils";
import BookmarkItem from "./components/BookmarkItem";
import CollectionsDropdown from "./components/CollectionsDropdown";
import { Bookmark } from "./types";
import { useRequest } from "./hooks/useRequest";

export default function Main(): ReactElement {
  const [searchText, setSearchText] = useState<string>("");
  const [collection, setCollection] = useCachedState<string>("selected-collection", "0");

  const { isLoading, bookmarks, collections } = useRequest({ collection, search: searchText });

  const onCollectionChange = (value: string) => {
    if (collection !== value) {
      setCollection(value);
    }
  };

  // operators help: https://help.raindrop.io/using-search#operators
  return (
    <List
      searchBarPlaceholder="Search bookmarks using Raindrop.io operators..."
      searchBarAccessory={<CollectionsDropdown isLoading={isLoading} handleChange={onCollectionChange} collections={collections} />}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle
    >
      {bookmarks?.items?.map((bookmark: Bookmark) => (
        <BookmarkItem key={bookmark._id} bookmark={bookmark} />
      ))}
    </List>
  );
}
