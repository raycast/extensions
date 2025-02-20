import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BookmarksParams, BookmarksResponse } from "../types";

export function useBookmarks({ collection, search = "" }: BookmarksParams) {
  const preferences: Preferences = getPreferenceValues();
  const url = new URL(`https://api.raindrop.io/rest/v1/raindrops/${collection}`);

  url.searchParams.set("sort", preferences.sortBy ? preferences.sortBy : "-created");
  url.searchParams.set("search", search);

  return useFetch<BookmarksResponse>(url.href, {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
    onError: () => {
      showToast(Toast.Style.Failure, "Cannot search bookmark");
    },
  });
}
