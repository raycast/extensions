import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Bookmark, BookmarksParams, BookmarksResponse } from "../types";
import { useCallback, useEffect, useState } from "react";

export function useBookmarks({ collection, search = "" }: BookmarksParams) {
  const preferences: Preferences = getPreferenceValues();
  const url = new URL(`https://api.raindrop.io/rest/v1/raindrops/${collection}`);
  const perPage = 50; // maximum value `perpage`: https://developer.raindrop.io/v1/raindrops/multiple#common-parameters
  const bookmarkLimit = 200; // limit to 4 pages, i.e. 4 API requests at once

  url.searchParams.set("sort", preferences.sortBy ? preferences.sortBy : "-created");
  url.searchParams.set("search", search);
  url.searchParams.set("perpage", perPage.toString());

  const [bookmarks, setBookmarks] = useState<BookmarksResponse>({ items: [] });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllPages = async () => {
    let page = 0;
    let allBookmarks: Bookmark[] = [];
    let fetchMore = true;

    try {
      while (fetchMore) {
        url.searchParams.set("page", page.toString());

        const response = await fetch(url.href, {
          headers: {
            Authorization: `Bearer ${preferences.token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} (${response.statusText})`);
        }

        const data: BookmarksResponse = await response.json();
        allBookmarks = allBookmarks.concat(data.items);

        const belowLimit = allBookmarks.length < bookmarkLimit;
        const hasMore = data.items.length === perPage;
        fetchMore = preferences.fetchAllResults && belowLimit && hasMore;
        page++;
      }

      setBookmarks({ items: allBookmarks });
    } catch (err) {
      showFailureToast(err, { title: "Cannot fetch bookmarks" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCallback = useCallback(fetchAllPages, [
    collection,
    search,
    preferences.sortBy,
    preferences.token,
    preferences.fetchAllResults,
  ]);

  useEffect(() => {
    fetchCallback();
  }, [fetchCallback]);

  return {
    isLoading,
    data: bookmarks,
    revalidate: fetchAllPages,
  };
}
