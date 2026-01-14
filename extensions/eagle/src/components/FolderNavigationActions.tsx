import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { useMemo } from "react";
import { Item, Folder } from "../@types/eagle";
import { useFolderList } from "../utils/query";
import { FolderView } from "../folder";

interface FolderNavigationActionsProps {
  item: Item;
  shortcut?: Keyboard.Shortcut;
}

export function FolderNavigationActions({ item, shortcut }: FolderNavigationActionsProps) {
  const { data: allFolders = [] } = useFolderList();

  const itemFolders = useMemo(() => {
    if (!item.folders || item.folders.length === 0 || allFolders.length === 0) return [];

    // Flatten all folders including nested ones
    const flattenFolders = (folders: Folder[]): Folder[] => {
      return folders.reduce((acc: Folder[], folder) => {
        acc.push(folder);
        if (folder.children && folder.children.length > 0) {
          acc.push(...flattenFolders(folder.children));
        }
        return acc;
      }, []);
    };

    const allFlatFolders = flattenFolders(allFolders);
    return item.folders
      .map((folderId) => allFlatFolders.find((f) => f.id === folderId))
      .filter((folder): folder is Folder => !!folder);
  }, [item.folders, allFolders]);

  if (itemFolders.length === 0) return null;

  if (itemFolders.length === 1) {
    return (
      <Action.Push
        target={<FolderView folder={itemFolders[0]} />}
        title={`Open in ${itemFolders[0].name}`}
        icon={Icon.Folder}
        shortcut={shortcut}
      />
    );
  }

  return (
    <ActionPanel.Submenu title="Open in Folder" icon={Icon.Folder} shortcut={shortcut}>
      {itemFolders.map((folder) => (
        <Action.Push key={folder.id} target={<FolderView folder={folder} />} title={folder.name} icon={Icon.Folder} />
      ))}
    </ActionPanel.Submenu>
  );
}
