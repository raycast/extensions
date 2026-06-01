import { Action, Icon, ActionPanel, Image } from "@raycast/api";
import { BookmarkItem } from "../types";
import React, { useMemo } from "react";

interface FlattenedFolder {
  id: string;
  title: string;
  path: string[];
  browserType?: string;
}

function flattenFolders(
  items: BookmarkItem[],
  path: string[] = [],
  result: FlattenedFolder[] = [],
  allowedBrowser?: string,
): FlattenedFolder[] {
  for (const item of items) {
    // Only process folders (items with children)
    if (item.children) {
      // Filter by browser if specified
      if (allowedBrowser && item.browserType !== allowedBrowser) {
        continue;
      }

      const currentPath = [...path, item.title];
      result.push({
        id: item.id,
        title: item.title,
        path: currentPath,
        browserType: item.browserType,
      });

      flattenFolders(item.children, currentPath, result, allowedBrowser);
    }
  }
  return result;
}

interface BookmarkFolderPickerProps {
  bookmarks: BookmarkItem[];
  browserType?: string;
  currentFolderId?: string; // To exclude the folder itself (if moving a folder)
  currentParentId?: string; // To exclude the folder it is currently in
  onSelect: (folderId: string) => void;
  actionTitle?: string;
  icon?: Image.ImageLike;
}

export const BookmarkFolderPicker = React.memo(
  ({
    bookmarks,
    browserType,
    currentFolderId,
    currentParentId,
    onSelect,
    actionTitle = "Move to Folder",
    icon = Icon.Folder,
  }: BookmarkFolderPickerProps) => {
    const folders = useMemo(() => {
      // Filter by the target tab's browser type if provided.
      const allFolders = flattenFolders(bookmarks, [], [], browserType);

      // Filter out:
      // 1. The folder itself (can't move to self)
      // 2. The current parent folder (already there)
      return allFolders.filter(
        (f) => String(f.id) !== String(currentFolderId) && String(f.id) !== String(currentParentId),
      );
    }, [bookmarks, browserType, currentFolderId, currentParentId]);

    if (folders.length === 0) {
      return null;
    }

    return (
      <ActionPanel.Submenu title={actionTitle} icon={icon} shortcut={{ modifiers: ["shift"], key: "/" }}>
        {folders.map((folder) => (
          <Action
            key={folder.id}
            title={folder.path.join(" > ")}
            icon={Icon.Folder}
            onAction={() => onSelect(folder.id)}
          />
        ))}
      </ActionPanel.Submenu>
    );
  },
);
