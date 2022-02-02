import useSWR from "swr";
import { fetchBookmarks, sendAction } from "./api";
import { Bookmark } from "./types";
import { Toast, ToastStyle } from "@raycast/api";

interface UseBookmarksOptions {
  name?: string;
  tag?: string;
  state?: "unread" | "archive" | "all";
}

export function useBookmarks({ name, tag, state }: UseBookmarksOptions) {
  const { data, error, isValidating, mutate } = useSWR<Array<Bookmark>>(
    ["v3/get", name, tag, state],
    async (url, name, tag, state) => {
      return fetchBookmarks({ name, tag, state });
    }
  );

  async function toggleFavorite(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = new Toast({
      title: bookmark?.favorite ? "Removing from favorites" : "Adding to favorites",
      style: ToastStyle.Animated,
    });
    toast.show();
    await sendAction({ id, action: bookmark?.favorite ? "unfavorite" : "favorite" });
    await mutate();
    toast.title = bookmark?.favorite ? "Removed from favorites" : "Added to favorites";
    toast.style = ToastStyle.Success;
    toast.message = bookmark?.title;
  }

  async function deleteBookmark(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = new Toast({
      title: "Deleting bookmark",
      style: ToastStyle.Animated,
    });
    toast.show();
    await sendAction({ id, action: "delete" });
    await mutate();
    toast.title = "Deleted successfully";
    toast.style = ToastStyle.Success;
    toast.message = bookmark?.title;
  }

  async function archiveBookmark(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = new Toast({
      title: "Archiving bookmark",
      style: ToastStyle.Animated,
    });
    toast.show();
    await sendAction({ id, action: "archive" });
    await mutate();
    toast.title = "Archived successfully";
    toast.style = ToastStyle.Success;
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

export function useAvailableTags() {
  const { bookmarks, loading } = useBookmarks({ state: "all" });
  return {
    tags: [...new Set(bookmarks.map((bookmark) => bookmark.tags).flat())],
    loading,
  };
}
