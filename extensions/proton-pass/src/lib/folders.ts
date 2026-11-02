import { listedUnder } from "./shared-items";
import { Folder, FolderRef, Item } from "./types";

/** Between the names of a path: "Personal › Banking › Cards". */
export const PATH_SEPARATOR = " › ";

const FOLDER_VALUE_PREFIX = "folder:";

/**
 * Each folder's path: the folders from the vault's root down to it, by folder ID. A folder whose parent isn't listed
 * starts its path.
 */
export function folderPaths(folders: Folder[]): Map<string, FolderRef[]> {
  const byId = new Map(folders.map((folder) => [folder.folderId, folder]));
  const paths = new Map<string, FolderRef[]>();
  function pathOf(folder: Folder, visited: Set<string>): FolderRef[] {
    const known = paths.get(folder.folderId);
    if (known) return known;
    visited.add(folder.folderId);
    const parent = folder.parentId ? byId.get(folder.parentId) : undefined;
    // Proton Pass can't nest a folder in itself, but a loop in pass-cli's output must not hang the extension.
    const parentPath = parent && !visited.has(parent.folderId) ? pathOf(parent, visited) : [];
    const path = [...parentPath, { id: folder.folderId, name: folder.name }];
    paths.set(folder.folderId, path);
    return path;
  }
  for (const folder of folders) pathOf(folder, new Set());
  return paths;
}

/** The items with the path of their folder. An item whose folder isn't among `folders` gets none. */
export function withFolderPaths(items: Item[], folders: Folder[]): Item[] {
  const paths = folderPaths(folders);
  return items.map((item) => {
    const folderPath = item.folderId ? paths.get(item.folderId) : undefined;
    return folderPath ? { ...item, folderPath } : item;
  });
}

/** "Banking › Cards". */
export function folderPathLabel(path: FolderRef[]): string {
  return path.map((folder) => folder.name).join(PATH_SEPARATOR);
}

/** A folder with items in it, for the vault menu and the vault list. */
export interface FolderEntry {
  /** The vault's share ID. */
  shareId: string;
  /** From the vault's root down to the folder, which comes last. */
  path: FolderRef[];
  /** Items in the folder, its subfolders' included. */
  itemCount: number;
}

/** The vault menu's value for a folder. Vault share IDs never start the same way. */
export function folderValue(shareId: string, folderId: string): string {
  return `${FOLDER_VALUE_PREFIX}${shareId}:${folderId}`;
}

export function folderEntryValue(entry: FolderEntry): string {
  return folderValue(entry.shareId, entry.path[entry.path.length - 1].id);
}

export function isFolderValue(value: string): boolean {
  return value.startsWith(FOLDER_VALUE_PREFIX);
}

function comparePaths(a: FolderRef[], b: FolderRef[]): number {
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const order = a[index].name.localeCompare(b[index].name, undefined, { sensitivity: "base", numeric: true });
    if (order !== 0) return order;
    // Two folders can have the same name.
    if (a[index].id !== b[index].id) return a[index].id < b[index].id ? -1 : 1;
  }
  return a.length - b.length;
}

/** By vault, then by path. Vaults are ordered by their callers. */
function compareEntries(a: FolderEntry, b: FolderEntry): number {
  if (a.shareId !== b.shareId) return a.shareId < b.shareId ? -1 : 1;
  return comparePaths(a.path, b.path);
}

/**
 * The folders that have items, in them or in their subfolders, sorted by path within each vault, a folder before its
 * subfolders. Empty folders aren't known: pass-cli only lists the folders of vaults with items in folders.
 */
export function folderEntries(items: Item[]): FolderEntry[] {
  const entries = new Map<string, FolderEntry>();
  for (const item of items) {
    const path = item.folderPath;
    if (!path || item.sharedWithMe) continue;
    path.forEach((folder, index) => {
      const value = folderValue(item.shareId, folder.id);
      const entry = entries.get(value);
      if (entry) entry.itemCount++;
      else entries.set(value, { shareId: item.shareId, path: path.slice(0, index + 1), itemCount: 1 });
    });
  }
  return [...entries.values()].sort(compareEntries);
}

/** Folders after a listing: those of vaults whose items couldn't be listed stay as they were. */
export function refreshFolderEntries(
  previous: FolderEntry[],
  items: Item[],
  failedShareIds: Set<string>,
): FolderEntry[] {
  const kept = previous.filter((entry) => failedShareIds.has(entry.shareId));
  const listed = folderEntries(items).filter((entry) => !failedShareIds.has(entry.shareId));
  return [...kept, ...listed].sort(compareEntries);
}

/** Whether an item shows for a choice of the vault menu other than All Vaults: a vault, Shared with Me or a folder. */
export function isListedIn(item: Pick<Item, "shareId" | "sharedWithMe" | "folderPath">, value: string): boolean {
  if (!isFolderValue(value)) return listedUnder(item) === value;
  return (
    !item.sharedWithMe && (item.folderPath?.some((folder) => folderValue(item.shareId, folder.id) === value) ?? false)
  );
}
