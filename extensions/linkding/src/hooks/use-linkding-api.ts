import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { GetLinkdingBookmarkResponse, LinkdingBookmark } from "../types/linkding-types";

export const useLinkdingApi = (searchText: string) => {
  const { serverUrl, apiKey } = useMemo(() => getPreferenceValues<Preferences>(), []);
  const requestOpts: RequestInit = useMemo(
    () => ({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
    }),
    [apiKey],
  );

  const {
    isLoading,
    data: bookmarks,
    mutate,
    revalidate,
  } = useFetch(
    `${serverUrl}/api/bookmarks/?${new URLSearchParams({
      q: searchText,
      // ideally we could just increase the limit here, but raycast OOMs on 1k+
      limit: "101",
    }).toString()}`,
    {
      ...requestOpts,
      mapResult: (response: GetLinkdingBookmarkResponse) => ({ data: response.results }),
      initialData: [] as LinkdingBookmark[],
      keepPreviousData: true,
    },
  );

  const deleteBookmark = async (bookmark: LinkdingBookmark) => {
    await mutate(fetch(`${serverUrl}/api/bookmarks/${bookmark.id}`, { ...requestOpts, method: "DELETE" }), {
      optimisticUpdate: (bookmarks) => bookmarks.filter((b) => b.id !== bookmark.id),
    });
  };

  const archiveBookmark = async (bookmark: LinkdingBookmark) => {
    await mutate(fetch(`${serverUrl}/api/bookmarks/${bookmark.id}/archive/`, { ...requestOpts, method: "POST" }), {
      optimisticUpdate: (bookmarks) => bookmarks.filter((b) => b.id !== bookmark.id),
    });
  };

  return { isLoading, bookmarks, revalidate, deleteBookmark, archiveBookmark };
};
