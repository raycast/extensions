import { useEffect } from "react";
import { getPreferenceValues, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import BookmarkItem from "./components/BookmarkItem";
import CollectionsDropdown from "./components/CollectionsDropdown";
import { Bookmark } from "./types";
import { useRequest } from "./hooks/useRequest";
import { useLastUsedCollection } from "./hooks/useLastUsedCollection";

export default function LatestBookmarks() {
  const preferences: Preferences = getPreferenceValues();
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
  const [collection, setCollection] = useCachedState<string>("selected-collection", defaultCollection);

  const { isLoading, bookmarks, collections, revalidate } = useRequest({ collection });

  const onCollectionChange = (value: string) => {
    if (collection !== value) {
      setCollection(value);
      setNextCollectionToUse(value);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter bookmarks by title..."
      searchBarAccessory={
        <CollectionsDropdown
          isLoading={isLoading}
          handleChange={onCollectionChange}
          collections={collections}
          defaultValue={collection}
        />
      }
    >
      {bookmarks?.items?.map((bookmark: Bookmark) => (
        <BookmarkItem key={bookmark._id} bookmark={bookmark} revalidate={revalidate} />
      ))}
    </List>
  );
}
