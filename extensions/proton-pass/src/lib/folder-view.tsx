import { Icon } from "@raycast/api";
import { MutableRefObject, useEffect, useMemo, useState } from "react";
import { renderErrorView } from "./error-views";
import { FolderEntry, folderEntryValue, insideFolders, isDirectlyIn, PATH_SEPARATOR, subfolders } from "./folders";
import { ItemList } from "./item-list";
import { NotLoggedInView } from "./login-view";
import { SortOrder } from "./sort";
import { Item, PassCliErrorType } from "./types";

/** What the folders opened from an item list show: that list's items and folders, as it loads them. */
export interface FolderContents {
  items: Item[];
  folders: FolderEntry[];
  isLoading: boolean;
  /** What that list shows instead of its items, e.g. the login screen once the session has ended. */
  error?: { type: PassCliErrorType; message?: string } | null;
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
  // The folder as the list underneath knows it now: moved in Proton Pass meanwhile, it has another path.
  const current = useMemo(
    () => contents.folders.find((entry) => folderEntryValue(entry) === folderEntryValue(folder)) ?? folder,
    [contents.folders, folder],
  );
  const items = useMemo(
    () => contents.items.filter((item) => isDirectlyIn(item, current.shareId, current)),
    [contents.items, current],
  );
  const folders = useMemo(() => subfolders(contents.folders, current.shareId, current), [contents.folders, current]);
  const inside = useMemo(
    () => insideFolders(contents.folders, contents.items, folders),
    [contents.folders, contents.items, folders],
  );

  // An opened folder shows the same login screen or error as the list underneath, rather than looking empty, and its
  // contents again once they're fixed.
  if (contents.error?.type === "not_authenticated") return <NotLoggedInView reload={onRefresh} />;
  const errorView = renderErrorView(contents.error?.type ?? null, onRefresh, "Load Items", contents.error?.message);
  if (errorView) return errorView;

  return (
    <ItemList
      navigationTitle={[vaultName, ...current.path.map(({ name }) => name)].join(PATH_SEPARATOR)}
      sortChoice={sortChoice}
      // The search bar has no vault menu here: Sort by takes its place, as in the vault list.
      sortInSearchBar
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
