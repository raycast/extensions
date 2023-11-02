import { useCachedPromise } from "@raycast/utils";
import { fetchBookmarks, fetchTags, sendAction } from "./api";
import { ReadState } from "./types";
import { showToast, Toast } from "@raycast/api";
import { HTTPError } from "got";
import { capitalize } from "lodash";

interface UseBookmarksOptions {
  state: ReadState;
  count?: number;
  search?: string;
  tag?: string;
}

export function useBookmarks({ state, tag: selectedTag, search, count }: UseBookmarksOptions) {
  const { data, isLoading, mutate, revalidate } = useCachedPromise(
    async (url, options) => fetchBookmarks(options),
    ["v3/get", { state, tag: selectedTag, count, search }],
    {
      initialData: [],
      keepPreviousData: true,
      onError: (error) => {
        if (error && error instanceof HTTPError) {
          if (error.response.statusCode === 401 || error.response.statusCode === 403) {
            showToast(Toast.Style.Failure, "Invalid Credentials", "Check you Pocket extension preferences");
          } else {
            throw error;
          }
        }
      },
    }
  );

  async function toggleFavorite(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = new Toast({
      title: bookmark?.favorite ? "Removing from favorites" : "Adding to favorites",
      style: Toast.Style.Animated,
    });
    toast.show();
    await mutate(sendAction({ id, action: bookmark?.favorite ? "unfavorite" : "favorite" }), {
      optimisticUpdate: (bookmarks) => bookmarks.map((b) => (b.id === id ? { ...b, favorite: !b.favorite } : b)),
    });
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
    await mutate(sendAction({ id, action: "delete" }), {
      optimisticUpdate: (bookmarks) => bookmarks.filter((bookmark) => bookmark.id !== id),
    });
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
    await mutate(sendAction({ id, action: "archive" }), {
      optimisticUpdate: (bookmarks) => {
        if (state === ReadState.All) {
          return bookmarks.map((b) => (b.id === id ? { ...b, archived: true } : b));
        } else {
          return bookmarks.filter((b) => b.id !== id);
        }
      },
    });
    toast.title = "Archived successfully";
    toast.style = Toast.Style.Success;
    toast.message = bookmark?.title;
  }

  async function reAddBookmark(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = new Toast({
      title: "Re-adding bookmark",
      style: Toast.Style.Animated,
    });
    toast.show();
    await mutate(sendAction({ id, action: "readd" }), {
      optimisticUpdate: (bookmarks) => {
        if (state === ReadState.All) {
          return bookmarks.map((b) => (b.id === id ? { ...b, archived: false } : b));
        } else {
          return bookmarks.filter((b) => b.id !== id);
        }
      },
    });
    toast.title = "Re-added successfully";
    toast.style = Toast.Style.Success;
    toast.message = bookmark?.title;
  }

  async function addTag(id: string, tag: string) {
    const toast = new Toast({
      title: "Tagging bookmark",
      message: capitalize(tag),
      style: Toast.Style.Animated,
    });
    toast.show();
    await mutate(sendAction({ id, action: "tags_add", tags: tag }), {
      optimisticUpdate: (bookmarks) => {
        return bookmarks.map((b) => (b.id === id ? { ...b, tags: [...b.tags, tag] } : b));
      },
    });
    toast.title = "Tag added correctly";
    toast.style = Toast.Style.Success;
  }

  async function removeTag(id: string, tag: string) {
    const toast = new Toast({
      title: "Removing tag",
      message: capitalize(tag),
      style: Toast.Style.Animated,
    });
    toast.show();
    await mutate(sendAction({ id, action: "tags_remove", tags: tag }), {
      optimisticUpdate: (bookmarks) => {
        if (selectedTag === tag) {
          return bookmarks.filter((b) => b.id !== id);
        } else {
          return bookmarks.map((b) => (b.id === id ? { ...b, tags: b.tags.filter((t) => t !== tag) } : b));
        }
      },
    });
    toast.title = "Tag removed correctly";
    toast.style = Toast.Style.Success;
  }

  return {
    bookmarks: data || [],
    loading: isLoading,
    refreshBookmarks: revalidate,
    toggleFavorite,
    deleteBookmark,
    archiveBookmark,
    reAddBookmark,
    addTag,
    removeTag,
  };
}

export function useTags() {
  const { data } = useCachedPromise(async (key) => fetchTags(), ["v3/tags"], {
    initialData: [],
    keepPreviousData: true,
    onError: (error) => {
      if (error && error instanceof HTTPError) {
        if (error.response.statusCode === 401 || error.response.statusCode === 403) {
          showToast(Toast.Style.Failure, "Invalid Credentials", "Check you Pocket extension preferences");
        } else {
          throw error;
        }
      }
    },
  });

  return data;
}
