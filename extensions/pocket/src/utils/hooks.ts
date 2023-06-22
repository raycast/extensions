import useSWR from "swr";
import { fetchBookmarks, sendAction } from "./api";
import { Bookmark, ReadState } from "./types";
import { showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { HTTPError } from "got";

interface UseBookmarksOptions {
  readState: ReadState;
}

export function useBookmarks({ readState }: UseBookmarksOptions) {
  const { data, error, isValidating, mutate } = useSWR<Array<Bookmark>, HTTPError>(
    ["v3/get", readState],
    async (url, readState) => {
      return fetchBookmarks({ state: readState });
    }
  );

  useEffect(() => {
    if (error) {
      if (error.response.statusCode === 401 || error.response.statusCode === 403) {
        showToast(Toast.Style.Failure, "Invalid Credentials", "Check you Pocket extension preferences");
      } else {
        throw error;
      }
    }
  }, [error]);

  async function toggleFavorite(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = new Toast({
      title: bookmark?.favorite ? "Removing from favorites" : "Adding to favorites",
      style: Toast.Style.Animated,
    });
    toast.show();
    await sendAction({ id, action: bookmark?.favorite ? "unfavorite" : "favorite" });
    await mutate();
    toast.title = bookmark?.favorite ? "Removed from favorites" : "Added to favorites";
    toast.style = Toast.Style.Success;
    toast.message = bookmark?.title;
  }

  async function deleteBookmark(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = new Toast({
      title: "Deleting bookmark",
      style: Toast.Style.Animated,
    });
    toast.show();
    await sendAction({ id, action: "delete" });
    await mutate();
    toast.title = "Deleted successfully";
    toast.style = Toast.Style.Success;
    toast.message = bookmark?.title;
  }

  async function archiveBookmark(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = new Toast({
      title: "Archiving bookmark",
      style: Toast.Style.Animated,
    });
    toast.show();
    await sendAction({ id, action: "archive" });
    await mutate();
    toast.title = "Archived successfully";
    toast.style = Toast.Style.Success;
    toast.message = bookmark?.title;
  }

  return {
    bookmarks: data || [],
    loading: (!data && !error) || isValidating,
    refreshBookmarks: mutate,
    toggleFavorite,
    deleteBookmark,
    archiveBookmark,
  };
}
