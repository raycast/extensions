import { useCachedState } from "@raycast/utils";
import { useEffect, useMemo } from "react";
import { buildCollectionsOptions } from "../helpers/collections";
import { BookmarksParams, CollectionItem } from "../types";
import { useBookmarks } from "./useBookmarks";
import { useCollections } from "./useCollections";
import { useUser } from "./useUser";

export function useRequest({ collection = "0", search = "" }: BookmarksParams) {
  const [cachedCollections, setCachedCollections] = useCachedState<CollectionItem[]>("collections", []);
  const { isLoading: isLoadingUser, data: user } = useUser();
  const { isLoading: isLoadingBookmarks, data: bookmarks, revalidate } = useBookmarks({ collection, search });
  const { isLoading: isLoadingCollections, data: collections } = useCollections();
  const isLoading = useMemo(
    () => isLoadingUser || isLoadingBookmarks || isLoadingCollections,
    [isLoadingUser, isLoadingBookmarks, isLoadingCollections],
  );

  useEffect(() => {
    if (!isLoading && user?.result && collections?.result) {
      const tree = buildCollectionsOptions(user, collections);
      setCachedCollections(tree);
    }
  }, [isLoadingUser, isLoadingBookmarks, isLoadingCollections]);

  return {
    isLoading,
    bookmarks,
    collections: cachedCollections,
    revalidate,
  };
}
