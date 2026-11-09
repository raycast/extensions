import { Icon } from "@raycast/api";
import { MutableRefObject, useEffect, useMemo, useState } from "react";
import { FolderEntry, insideFolders, isDirectlyIn, PATH_SEPARATOR, subfolders } from "./folders";
import { ItemList } from "./item-list";
import { SortOrder } from "./sort";
import { Item } from "./types";

/** What the folders opened from an item list show: that list's items and folders, as it loads them. */
export interface FolderContents {
  items: Item[];
  folders: FolderEntry[];
  isLoading: boolean;
}

/** Hands an item list's latest items and folders to the folders opened from it, which stay open on top of it. */
export interface FolderSource {
  get(): FolderContents;
  set(contents: FolderContents): void;
  subscribe(listener: () => void): () => void;
}

export function createFolderSource(): FolderSource {
  let contents: FolderContents = { items: [], folders: [], isLoading: true };
  const listeners = new Set<() => void>();
  return {
    get: () => contents,
    set(next) {
      contents = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

interface FolderViewProps {
  source: FolderSource;
  vaultName: string;
  folder: FolderEntry;
  sortChoice?: MutableRefObject<SortOrder>;
  onRefresh: () => void;
}

/** A folder opened from an item list: its subfolders, then the items right inside it. Esc goes back up. */
export function FolderView({ source, vaultName, folder, sortChoice, onRefresh }: FolderViewProps) {
  const [contents, setContents] = useState(source.get);
  useEffect(() => source.subscribe(() => setContents(source.get())), [source]);
  const items = useMemo(
    () => contents.items.filter((item) => isDirectlyIn(item, folder.shareId, folder)),
    [contents.items, folder],
  );
  const folders = useMemo(() => subfolders(contents.folders, folder.shareId, folder), [contents.folders, folder]);
  const inside = useMemo(
    () => insideFolders(contents.folders, contents.items, folders),
    [contents.folders, contents.items, folders],
  );

  return (
    <ItemList
      navigationTitle={[vaultName, ...folder.path.map(({ name }) => name)].join(PATH_SEPARATOR)}
      sortChoice={sortChoice}
      items={items}
      folders={folders}
      insideFolders={inside}
      openFolder={(subfolder) => (
        <FolderView
          source={source}
          vaultName={vaultName}
          folder={subfolder}
          sortChoice={sortChoice}
          onRefresh={onRefresh}
        />
      )}
      isLoading={contents.isLoading}
      emptyView={{ icon: Icon.Folder, title: "Empty Folder", description: "No items in this folder" }}
      onRefresh={onRefresh}
    />
  );
}
