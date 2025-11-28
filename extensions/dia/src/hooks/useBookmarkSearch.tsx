import { BookmarkItem, BookmarkDirectory, BookmarkSearchResult } from "../interfaces";
import { ReactNode, useState, useMemo } from "react";
import { NO_BOOKMARKS_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { usePromise } from "@raycast/utils";
import { parseSearchQuery, matchesQuery } from "../utils/search-parser";
import { getBookmarksTree } from "../utils";
import { List } from "@raycast/api";

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
 * Navigate to a specific folder by path
 */
function navigateToFolder(tree: BookmarkDirectory, pathIds: string[]): BookmarkDirectory | null {
  if (pathIds.length === 0) {
    return tree;
  }

  let current: BookmarkDirectory = tree;
  for (const id of pathIds) {
    const found = current.children.find((child) => child.id === id && child.type === "folder");
    if (!found) {
      return null;
    }
    current = found;
  }
  return current;
}

/**
 * Convert BookmarkDirectory to BookmarkItem with path information
 */
function toBookmarkItem(dir: BookmarkDirectory, path: string[], idPath: string[]): BookmarkItem {
  return {
    id: dir.id,
    name: dir.name,
    type: dir.type,
    url: dir.url,
    path: path,
    idPath: idPath,
    children: dir.children,
  };
}

/**
 * Recursively search all bookmarks
 */
function searchAllBookmarks(
  dir: BookmarkDirectory,
  query: string,
  currentPath: string[] = [],
  currentIdPath: string[] = [],
): BookmarkItem[] {
  const results: BookmarkItem[] = [];
  const parsedQuery = parseSearchQuery(query);

  for (const child of dir.children) {
    if (child.type === "url" && child.url) {
      const searchableText = `${child.name.toLowerCase()} ${child.url.toLowerCase()}`;
      if (matchesQuery(searchableText, parsedQuery)) {
        results.push(toBookmarkItem(child, [...currentPath, child.name], [...currentIdPath]));
      }
    } else if (child.type === "folder") {
      // Also search folder names
      const folderNameMatch = matchesQuery(child.name.toLowerCase(), parsedQuery);
      const newIdPath = [...currentIdPath, child.id];
      if (folderNameMatch) {
        results.push(toBookmarkItem(child, [...currentPath, child.name], newIdPath));
      }
      // Recursively search in subfolders
      results.push(...searchAllBookmarks(child, query, [...currentPath, child.name], newIdPath));
    }
  }

  return results;
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
        if (error.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else if (error.message === NO_BOOKMARKS_MESSAGE) {
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
    const currentFolder = navigateToFolder(bookmarkTree, currentFolderPath);
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
