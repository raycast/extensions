import { useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { useBookmarks } from "./useBookmarks";
import { useCollections } from "./useCollections";
import { useUser } from "./useUser";
import { buildCollectionsOptions } from "../helpers/collections";
import { BookmarksParams, CollectionItem } from "../types";

export function useRequest({ collection = "0", search = "" }: BookmarksParams) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [collections, setCollections] = useCachedState<CollectionItem[]>("collections", []);

  const { isLoading: isLoadingUserData, data: userData } = useUser();
  const { isLoading: isLoadingBookmarks, data: bookmarks } = useBookmarks({ collection, search });
  const { isLoading: isLoadingCollections, data: collectionsData } = useCollections();

  useEffect(() => {
    const isLoading = isLoadingUserData || isLoadingBookmarks || isLoadingCollections;
    setIsLoading(isLoading);

    if (!isLoading) {
      if (userData?.result && collectionsData?.result) {
        const tree = buildCollectionsOptions(userData, collectionsData);
        setCollections(tree);
      }
    }
  }, [isLoadingUserData, isLoadingBookmarks, isLoadingCollections]);

  return { isLoading, bookmarks, collections };
}
