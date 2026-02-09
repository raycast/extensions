import { confirmAlert, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useLinkdingApi } from "./hooks/use-linkding-api";
import { LinkdingBookmark } from "./types/linkding-types";

interface BookmarkMetadata {
  title: string;
  subtitle: string;
  tags: { tag: string }[];
  editUrl: string;
}

interface BookmarksContextValue {
  sortByFrecency: boolean;
  isLoading: boolean;
  bookmarks: LinkdingBookmark[];
  onDeleteBookmark: (bookmark: LinkdingBookmark) => Promise<void>;
  onArchiveBookmark: (bookmark: LinkdingBookmark) => Promise<void>;
  onOpenBookmark: (bookmark: LinkdingBookmark) => void;
  onCopyBookmark: (bookmark: LinkdingBookmark) => void;
  onResetBookmark: (bookmark: LinkdingBookmark) => void;
  onSearchTextChange: (searchText: string) => void;
  getBookmarkMetadata: (bookmark: LinkdingBookmark) => BookmarkMetadata;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const { sortByFrecency, serverUrl, showDescription, showTags } = useMemo(
    () => getPreferenceValues<Preferences>(),
    [],
  );

  const [searchText, setSearchText] = useState("");
  const {
    isLoading,
    bookmarks: apiBookmarks,
    deleteBookmark: apiDeleteBookmark,
    archiveBookmark: apiArchiveBookmark,
    revalidate,
  } = useLinkdingApi(searchText);

  const {
    data: sortedBookmarks,
    visitItem,
    resetRanking,
    // make a copy, since the hook (unexpectedly) sorts in place
  } = useFrecencySorting([...apiBookmarks], {
    key: (bookmark) => bookmark.id.toString(),
  });

  const bookmarks = sortByFrecency ? sortedBookmarks : apiBookmarks;

  const onSearchTextChange = (searchText: string) => setSearchText(searchText);

  const onDeleteBookmark = async (bookmark: LinkdingBookmark) => {
    if (!(await confirmAlert({ title: "Delete this bookmark?", message: "This cannot be undone!" }))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting bookmark");
    try {
      await apiDeleteBookmark(bookmark);
      toast.style = Toast.Style.Success;
      toast.title = "Bookmark deleted";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete bookmark";
      toast.message = String(err);
    }
  };

  const onArchiveBookmark = async (bookmark: LinkdingBookmark) => {
    const toast = await showToast(Toast.Style.Animated, "Archiving bookmark");
    try {
      await apiArchiveBookmark(bookmark);
      toast.style = Toast.Style.Success;
      toast.title = "Bookmark archived";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to archive bookmark";
      toast.message = String(err);
    }
  };

  const onOpenBookmark = (bookmark: LinkdingBookmark) => {
    if (sortByFrecency) visitItem(bookmark);
  };

  const onCopyBookmark = (bookmark: LinkdingBookmark) => {
    if (sortByFrecency) visitItem(bookmark);
    showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
  };

  const onResetBookmark = async (bookmark: LinkdingBookmark) => {
    if (sortByFrecency) {
      await resetRanking(bookmark);
      revalidate();
    }
  };

  const getBookmarkMetadata = useCallback(
    (bookmark: LinkdingBookmark): BookmarkMetadata => {
      const title = bookmark.title.length > 0 ? bookmark.title : (bookmark.website_title ?? bookmark.url);
      let subtitle = "";
      if (showDescription) {
        subtitle =
          bookmark.description && bookmark.description.length > 0
            ? bookmark.description
            : (bookmark.website_description ?? "");
      }
      const tags = showTags ? bookmark.tag_names.map((tag) => ({ tag: "#" + tag })) : [];
      const editUrl = `${serverUrl}/bookmarks/${bookmark.id}/edit`;
      return { title, subtitle, tags, editUrl };
    },
    [serverUrl, showDescription, showTags],
  );

  const value: BookmarksContextValue = {
    sortByFrecency,
    isLoading,
    bookmarks,
    onDeleteBookmark,
    onArchiveBookmark,
    onOpenBookmark,
    onCopyBookmark,
    onResetBookmark,
    onSearchTextChange,
    getBookmarkMetadata,
  };

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export const useBookmarksContext = () => {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error("useBookmarksContext must be used within a BookmarksProvider");
  }
  return context;
};
