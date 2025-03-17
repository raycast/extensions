import { useEffect } from "react";
import { getPreferenceValues, List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { useCachedState } from "@raycast/utils";
import BookmarkItem from "./components/BookmarkItem";
import CollectionsDropdown from "./components/CollectionsDropdown";
import { Bookmark } from "./types";
import { useRequest } from "./hooks/useRequest";
import { useLastUsedCollection } from "./hooks/useLastUsedCollection";

export default function Main(): ReactElement {
  const preferences = getPreferenceValues();
  const [lastUsedCollection, setLastUsedCollection] = useCachedState<string>("last-used-collection", "0");

  const { getLastUsedCollection, setLastUsedCollection: setNextCollectionToUse } = useLastUsedCollection();

  useEffect(() => {
    const fetchLastUsedCollection = async () => {
      const luc = await getLastUsedCollection();
      setLastUsedCollection(luc || "0");
    };
    fetchLastUsedCollection();
  }, []);

  const defaultCollection = preferences.useLastCollection ? lastUsedCollection : "0";

  const [searchText, setSearchText] = useState<string>("");
  const [collection, setCollection] = useCachedState<string>("selected-collection", defaultCollection);

  const { isLoading, bookmarks, collections, revalidate } = useRequest({
    collection,
    search: searchText,
  });

  const onCollectionChange = (value: string) => {
    if (collection !== value) {
      setCollection(value);
      setNextCollectionToUse(value);
    }
  };

  const onSearch = (value: string) => {
    if (value !== searchText) {
      if (preferences.titleOnly) {
        value = `title:"${value}"`;
      }
      setSearchText(value);
    }
  };

  // operators help: https://help.raindrop.io/using-search#operators
  return (
    <List
      searchBarPlaceholder="Search bookmarks using Raindrop.io operators..."
      searchBarAccessory={
        <CollectionsDropdown
          isLoading={isLoading}
          handleChange={onCollectionChange}
          collections={collections}
          defaultValue={collection}
        />
      }
      onSearchTextChange={onSearch}
      isLoading={isLoading}
      throttle
    >
      {bookmarks?.items?.map((bookmark: Bookmark) => (
        <BookmarkItem key={bookmark._id} bookmark={bookmark} revalidate={revalidate} />
      ))}
    </List>
  );
}
