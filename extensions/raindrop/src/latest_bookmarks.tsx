import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import BookmarkItem from "./components/BookmarkItem";
import CollectionsDropdown from "./components/CollectionsDropdown";
import { Bookmark } from "./types";
import { useRequest } from "./hooks/useRequest";

export default function LatestBookmarks() {
  const [collection, setCollection] = useCachedState<string>("selected-collection", "0");

  const { isLoading, bookmarks, collections } = useRequest({ collection });

  const onCollectionChange = (value: string) => {
    if (collection !== value) {
      setCollection(value);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter bookmarks by title..."
      searchBarAccessory={<CollectionsDropdown isLoading={isLoading} handleChange={onCollectionChange} collections={collections} />}
    >
      {bookmarks?.items?.map((bookmark: Bookmark) => (
        <BookmarkItem key={bookmark._id} bookmark={bookmark} />
      ))}
    </List>
  );
}
