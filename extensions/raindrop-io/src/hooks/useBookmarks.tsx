import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Preferences, BookmarksParams, BookmarksResponse } from "../types";

export function useBookmarks({ collection, search = "" }: BookmarksParams) {
  const preferences: Preferences = getPreferenceValues();

  const url = `https://api.raindrop.io/rest/v1/raindrops/${collection}?sort=-created&search=${
    encodeURIComponent(search) ?? ""
  }`;
  const { isLoading, data, revalidate } = useFetch<BookmarksResponse>(url, {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
    onError: () => {
      showToast(Toast.Style.Failure, "Cannot search bookmark");
    },
  });

  return { isLoading, data, revalidate };
}
