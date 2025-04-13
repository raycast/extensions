import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { GetLinkdingBookmarkResponse, LinkdingBookmark, PostLinkdingBookmarkPayload } from "../types/linkding-types";

const useBookmarks = () => {
  const { serverUrl, apiKey } = useMemo(() => getPreferenceValues<Preferences>(), []);
  const apiUrl = useMemo(() => {
    const url = new URL("/api/bookmarks", serverUrl);
    // ensure there's a trailing slash, which linkding is finicky about
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  }, [serverUrl]);
  const requestOpts: RequestInit = useMemo(
    () => ({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
    }),
    [apiKey]
  );

  const {
    isLoading,
    data: bookmarks,
    mutate,
  } = useFetch(apiUrl, {
    ...requestOpts,
    mapResult: (response: GetLinkdingBookmarkResponse) => ({ data: response.results }),
    initialData: [] as LinkdingBookmark[],
  });

  const createBookmark = async (payload: PostLinkdingBookmarkPayload) => {
    const toast = await showToast(Toast.Style.Animated, "Creating bookmark");
    try {
      await mutate(
        fetch(apiUrl, {
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
      await mutate(fetch(new URL(id.toString(), apiUrl).toString(), { ...requestOpts, method: "DELETE" }), {
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

  return { isLoading, bookmarks, createBookmark, deleteBookmark };
};

export default useBookmarks;
