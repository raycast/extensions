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

/** The items with the path of their folder, among `folders`. An item whose folder isn't among them gets none. */
export function withFolderPaths(items: Item[], folders: VaultFolder[]): Item[] {
  const paths = new Map(folders.map((folder) => [folderEntryValue(folder), folder.path]));
  return items.map((item) => {
    const folderPath = item.folderId ? paths.get(folderValue(item.shareId, item.folderId)) : undefined;
    return folderPath ? { ...item, folderPath } : item;
  });
}

/** "Banking › Cards". */
export function folderPathLabel(path: FolderRef[]): string {
  return path.map((folder) => folder.name).join(PATH_SEPARATOR);
}

/** A folder of one of the user's vaults. */
export interface VaultFolder {
  /** The vault's share ID. */
  shareId: string;
  /** From the vault's root down to the folder, which comes last. */
  path: FolderRef[];
}

/** A folder for the vault menu and the vault list. */
export interface FolderEntry extends VaultFolder {
  /** Items in the folder, its subfolders' included. */
  itemCount: number;
}

/** The folders of the vaults whose folders a listing could list, empty ones included. */
export interface ListedFolders {
  shareIds: string[];
  folders: VaultFolder[];
}

const NOTHING_LISTED: ListedFolders = { shareIds: [], folders: [] };

/** A vault's folders, as pass-cli lists them. */
export function vaultFolders(shareId: string, folders: Folder[]): VaultFolder[] {
  return [...folderPaths(folders).values()].map((path) => ({ shareId, path }));
}

/** The vault menu's value for a folder. Vault share IDs never start the same way. */
export function folderValue(shareId: string, folderId: string): string {
  return `${FOLDER_VALUE_PREFIX}${shareId}:${folderId}`;
}

export function folderEntryValue(entry: VaultFolder): string {
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
function compareEntries(a: VaultFolder, b: VaultFolder): number {
  if (a.shareId !== b.shareId) return a.shareId < b.shareId ? -1 : 1;
  return comparePaths(a.path, b.path);
}

/**
 * The vault menu's and the vault list's folders: the ones listed, empty ones included, and those of the items, whose
 * vault's folders couldn't be listed this time. Each counts its items and its subfolders'. Sorted by path within each
 * vault, a folder before its subfolders.
 */
export function folderEntries(items: Item[], listed: VaultFolder[] = []): FolderEntry[] {
  const entries = new Map<string, FolderEntry>(
    listed.map((folder) => [folderEntryValue(folder), { ...folder, itemCount: 0 }]),
  );
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

/**
 * The folders known after a listing: those it listed, and the ones known before for the other vaults that still exist,
 * whose folders couldn't be listed this time.
 */
export function refreshVaultFolders(
  previous: VaultFolder[],
  vaults: { shareId: string }[],
  listed: ListedFolders = NOTHING_LISTED,
): VaultFolder[] {
  const listedShareIds = new Set(listed.shareIds);
  const existing = new Set(vaults.map((vault) => vault.shareId));
  const kept = previous.filter((folder) => existing.has(folder.shareId) && !listedShareIds.has(folder.shareId));
  return [...kept, ...listed.folders].sort(compareEntries);
}

/** Folders after a listing: those of vaults whose items couldn't be listed keep their earlier count. */
export function refreshFolderEntries(
  previous: FolderEntry[],
  items: Item[],
  known: VaultFolder[],
  failedShareIds: Set<string>,
): FolderEntry[] {
  const kept = previous.filter((entry) => failedShareIds.has(entry.shareId));
  const counted = folderEntries(items, known).filter((entry) => !failedShareIds.has(entry.shareId));
  return [...kept, ...counted].sort(compareEntries);
}

/** Whether an item shows for a choice of the vault menu other than All Vaults: a vault, Shared with Me or a folder. */
export function isListedIn(item: Pick<Item, "shareId" | "sharedWithMe" | "folderPath">, value: string): boolean {
  if (!isFolderValue(value)) return listedUnder(item) === value;
  return (
    !item.sharedWithMe && (item.folderPath?.some((folder) => folderValue(item.shareId, folder.id) === value) ?? false)
  );
}
