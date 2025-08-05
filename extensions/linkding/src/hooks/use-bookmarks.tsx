import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { GetLinkdingBookmarkResponse, LinkdingBookmark, PostLinkdingBookmarkPayload } from "../types/linkding-types";

const useBookmarks = () => {
  const { serverUrl, apiKey } = useMemo(() => getPreferenceValues<Preferences>(), []);
  const requestOpts: RequestInit = useMemo(
    () => ({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
    }),
    [apiKey]
  );

  const [filter, setFilter] = useState("");
  const {
    isLoading,
    data: bookmarks,
    mutate,
  } = useFetch(
    `${serverUrl}/api/bookmarks/?${new URLSearchParams({
      q: filter,
      // ideally we could just increase the limit here, but raycast OOMs on 1k+
      limit: "101",
    }).toString()}`,
    {
      ...requestOpts,
      mapResult: (response: GetLinkdingBookmarkResponse) => ({ data: response.results }),
      initialData: [] as LinkdingBookmark[],
      keepPreviousData: true,
    }
  );

  const createBookmark = async (payload: PostLinkdingBookmarkPayload) => {
    const toast = await showToast(Toast.Style.Animated, "Creating bookmark");
    try {
      await mutate(
        fetch(`${serverUrl}/api/bookmarks/`, {
          ...requestOpts,
          method: "POST",
          body: JSON.stringify(payload),
        })
      );
      toast.style = Toast.Style.Success;
      toast.title = "Created bookmark";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create bookmark";
      toast.message = String(err);
    }
  };

  const deleteBookmark = async (id: number) => {
    const toast = await showToast(Toast.Style.Animated, "Deleting bookmark");
    try {
      await mutate(fetch(`${serverUrl}/api/bookmarks/${id}`, { ...requestOpts, method: "DELETE" }), {
        optimisticUpdate: (bookmarks) => bookmarks.filter((bookmark) => bookmark.id !== id),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Bookmark deleted";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete bookmark";
      toast.message = String(err);
    }
  };

  return { isLoading, bookmarks, setFilter, createBookmark, deleteBookmark };
};

export default useBookmarks;
