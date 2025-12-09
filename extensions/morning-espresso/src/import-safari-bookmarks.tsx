import { Action, ActionPanel, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { execSync } from "child_process";
import { homedir, tmpdir } from "os";
import { readFileSync } from "fs";
import * as plist from "plist";
import SelectGroupForBookmarksForm from "./components/SelectGroupForBookmarksForm";

interface BookmarkItem {
  Title?: string;
  Children?: BookmarkItem[];
  URLString?: string;
  WebBookmarkType?: string;
  URIDictionary?: {
    title?: string;
  };
}

interface BookmarkFolder {
  id: string;
  title: string;
  path: string;
  bookmarks: { title: string; url: string }[];
  bookmarkCount: number;
}

const SAFARI_BOOKMARKS_PATH = `${homedir()}/Library/Safari/Bookmarks.plist`;
const XML_TMP_PATH = `${tmpdir()}/raycast-safari-bookmarks.xml`;

/**
 * Load and parse Safari bookmarks from the user's Bookmarks.plist.
 */
async function loadSafariBookmarkFolders(): Promise<BookmarkFolder[]> {
  try {
    /**
     * Bookmarks.plist is a binary plist.  We convert it to XML using plutil,
     * but instead of streaming the XML to stdout (which can overflow Raycast's
     * child_process buffer and cause ENOBUFS), we write it to a temp file and
     * read it from disk.
     */
    execSync(`/usr/bin/plutil -convert xml1 -o "${XML_TMP_PATH}" "${SAFARI_BOOKMARKS_PATH}"`);
    const xml = readFileSync(XML_TMP_PATH, "utf8");

    const root = plist.parse(xml) as { Children?: BookmarkItem[] };

    const rootChildren = root.Children ?? [];

    // Safari normally has a "BookmarksBar" item that actually contains the user folders.
    // If present, drill into it so our "top level" matches what the user sees in Safari.
    const bookmarksBar = rootChildren.find((item) => item.Title === "BookmarksBar");
    const topLevelItems = bookmarksBar?.Children ?? rootChildren;

    const folders = collectFoldersFromItems(topLevelItems, "");

    // Sort by full path for predictable ordering.
    return folders.sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    console.error("Failed to load Safari bookmarks", error);
    throw new Error("Could not read Safari bookmarks.  Make sure Safari is installed and has bookmarks.");
  }
}

/**
 * Recursively collect bookmark folders from a list of bookmark items.
 *
 * For each folder:
 *   • bookmarks = only the direct URL children of that folder
 *   • subfolders are processed recursively and returned as separate BookmarkFolder entries
 */
function collectFoldersFromItems(items: BookmarkItem[], parentPath: string): BookmarkFolder[] {
  const folders: BookmarkFolder[] = [];

  for (const item of items) {
    const children = item.Children ?? [];
    const isFolder = item.WebBookmarkType === "WebBookmarkTypeList" && !!item.Title;

    if (isFolder) {
      const title = item.Title ?? "Untitled";
      const currentPath = parentPath ? `${parentPath} > ${title}` : title;

      // Only direct bookmarks in this folder, not subfolders.
      const bookmarks = getDirectBookmarks(children);
      const bookmarkCount = bookmarks.length;

      if (bookmarkCount > 0) {
        folders.push({
          id: currentPath,
          title,
          path: currentPath,
          bookmarks,
          bookmarkCount,
        });
      }

      // Recurse into subfolders to discover them as separate folders.
      folders.push(...collectFoldersFromItems(children, currentPath));
    } else if (children.length > 0) {
      // Some nodes are containers without a title.  Still search deeper.
      folders.push(...collectFoldersFromItems(children, parentPath));
    }
  }

  return folders;
}

/**
 * Get only the direct URL children of a folder item.
 * This deliberately ignores bookmarks inside subfolders, so a parent folder
 * does not pull in bookmarks from its subfolders.
 */
function getDirectBookmarks(children: BookmarkItem[]): { title: string; url: string }[] {
  const results: { title: string; url: string }[] = [];

  for (const item of children) {
    if (item.URLString) {
      const title = item.URIDictionary?.title || item.Title || item.URLString;
      results.push({ title, url: item.URLString });
    }
  }

  return results;
}

export default function ImportSafariBookmarks() {
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const loadedFolders = await loadSafariBookmarkFolders();
        setFolders(loadedFolders);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load Safari bookmarks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  const hasFolders = folders.length > 0;

  const topLevelFolders = folders.filter((folder) => !folder.path.includes(" > "));
  const nestedFolders = folders.filter((folder) => folder.path.includes(" > "));

  const renderFolderItem = (folder: BookmarkFolder) => (
    <List.Item
      key={folder.id}
      title={folder.title}
      subtitle={folder.path !== folder.title ? folder.path : undefined}
      icon={{ source: Icon.Folder, tintColor: Color.Yellow }}
      accessories={[{ text: `${folder.bookmarkCount} bookmarks` }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Select Bookmarks and Tab Group"
            icon={Icon.Plus}
            target={<SelectGroupForBookmarksForm folderName={folder.title} bookmarks={folder.bookmarks} />}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Safari bookmark folders...">
      {!isLoading && !hasFolders && (
        <List.EmptyView title="No Safari Bookmarks Found" description="Make sure you have bookmarks in Safari." />
      )}

      {topLevelFolders.length > 0 && (
        <List.Section title="Top Level Folders">
          {topLevelFolders.map((folder) => renderFolderItem(folder))}
        </List.Section>
      )}

      {nestedFolders.length > 0 && (
        <List.Section title="Subfolders">{nestedFolders.map((folder) => renderFolderItem(folder))}</List.Section>
      )}
    </List>
  );
}
