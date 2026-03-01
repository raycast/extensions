import { ReactNode, useState, useMemo } from "react";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { BOOKMARK_NOT_INSTALLED_MESSAGE, BOOKMARK_NO_BOOKMARKS_MESSAGE } from "./constants";
import { BookmarkSearchResult } from "./types";
import { getBookmarksTree, navigateToBookmarkFolder, searchAllBookmarks, toBookmarkItem } from "./utils";

function NotInstalledError() {
  return (
    <List>
      <List.EmptyView title="Dia is not installed" description="Please install Dia browser to use this extension" />
    </List>
  );
}

function UnknownError() {
  return (
    <List>
      <List.EmptyView title="An error occurred" description="Please try again later" />
    </List>
  );
}

/**
 * Hook to browse and search Dia bookmarks with folder navigation
 */
export function useBookmarkSearch(query: string, currentFolderPath: string[]): BookmarkSearchResult {
  const [isEmpty, setIsEmpty] = useState<boolean>(false);
  const [errorView, setErrorView] = useState<ReactNode>();

  const {
    isLoading,
    data: bookmarkTree,
    revalidate,
  } = usePromise(
    async () => {
      const tree = await getBookmarksTree();
      setErrorView(undefined);
      setIsEmpty(tree.children.length === 0);
      return tree;
    },
    [],
    {
      onError(error) {
        if (error.message === BOOKMARK_NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else if (error.message === BOOKMARK_NO_BOOKMARKS_MESSAGE) {
          setIsEmpty(true);
        } else {
          setErrorView(<UnknownError />);
        }
      },
    },
  );

  const items = useMemo(() => {
    if (!bookmarkTree || isEmpty) {
      return [];
    }

    // If searching, return all matching bookmarks
    if (query.trim()) {
      return searchAllBookmarks(bookmarkTree, query);
    }

    // Otherwise, show current folder contents
    const currentFolder = navigateToBookmarkFolder(bookmarkTree, currentFolderPath);
    if (!currentFolder) {
      return [];
    }

    // Build name path for breadcrumb
    const namePath: string[] = [];
    let temp = bookmarkTree;
    for (const id of currentFolderPath) {
      const found = temp.children.find((child) => child.id === id && child.type === "folder");
      if (found) {
        namePath.push(found.name);
        temp = found;
      }
    }

    return currentFolder.children.map((child) => {
      const childIdPath = child.type === "folder" ? [...currentFolderPath, child.id] : currentFolderPath;
      return toBookmarkItem(child, [...namePath, child.name], childIdPath);
    });
  }, [bookmarkTree, query, currentFolderPath, isEmpty]);

  return {
    errorView,
    isLoading,
    items,
    currentPath: currentFolderPath,
    revalidate,
  };
}
