import { usePocketClient } from "../oauth/view";
import { useCachedPromise } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { ReadState } from "../api";
import { useTags } from "./use-tags";
import { titleCase } from "../utils";

interface UseBookmarksOptions {
  state: ReadState;
  count?: number;
  search?: string;
  contentType?: string;
  tag?: string;
}

export function useBookmarks({ state, tag: selectedTag, contentType, search, count }: UseBookmarksOptions) {
  const pocket = usePocketClient();

  const { registerTag } = useTags();

  const { data, isLoading, mutate, revalidate } = useCachedPromise(
    async (url, options) => pocket.getBookmarks(options),
    ["bookmarks", { state, tag: selectedTag, contentType, count, search }],
    {
      initialData: [],
      keepPreviousData: true,
    },
  );

  async function toggleFavorite(id: string) {
    const pocket = usePocketClient();

    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = await showToast({
      title: bookmark?.favorite ? "Removing from favorites" : "Adding to favorites",
      style: Toast.Style.Animated,
    });
    await mutate(bookmark?.favorite ? pocket.unfavoriteBookmark(id) : pocket.favoriteBookmark(id), {
      optimisticUpdate: (bookmarks) => bookmarks.map((b) => (b.id === id ? { ...b, favorite: !b.favorite } : b)),
    });
    toast.title = bookmark?.favorite ? "Removed from favorites" : "Added to favorites";
    toast.style = Toast.Style.Success;
    toast.message = bookmark?.title;
  }

  async function deleteBookmark(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = await showToast({
      title: "Deleting bookmark",
      style: Toast.Style.Animated,
    });
    await mutate(pocket.deleteBookmark(id), {
      optimisticUpdate: (bookmarks) => bookmarks.filter((bookmark) => bookmark.id !== id),
    });
    toast.title = "Deleted successfully";
    toast.style = Toast.Style.Success;
    toast.message = bookmark?.title;
  }

  async function archiveBookmark(id: string) {
    const bookmark = data?.find((bookmark) => bookmark.id === id);
    const toast = await showToast({
      title: "Archiving bookmark",
      style: Toast.Style.Animated,
    });
    await mutate(pocket.archiveBookmark(id), {
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
    const toast = await showToast({
      title: "Re-adding bookmark",
      style: Toast.Style.Animated,
    });
    await mutate(pocket.reAddBookmark(id), {
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

  async function addTag(id: string, _tag: string) {
    const tag = _tag.toLowerCase();
    registerTag(tag);
    const toast = await showToast({
      title: "Tagging bookmark",
      message: titleCase(tag),
      style: Toast.Style.Animated,
    });
    await mutate(pocket.addTag(id, tag), {
      optimisticUpdate: (bookmarks) => {
        return bookmarks.map((b) => (b.id === id ? { ...b, tags: [...b.tags, tag] } : b));
      },
    });
    toast.title = "Tag added correctly";
    toast.style = Toast.Style.Success;
  }

  async function removeTag(id: string, tag: string) {
    const toast = await showToast({
      title: "Removing tag",
      message: titleCase(tag),
      style: Toast.Style.Animated,
    });
    await mutate(pocket.removeTag(id, tag), {
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
