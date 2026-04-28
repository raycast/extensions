import { LocalStorage } from "@raycast/api";
import { BOOKMARKS_KEY, DEFAULT_FOLDER } from "./constants";
import type { BookmarkFolder, HugeIcon } from "./types";

function cloneFolder(folder: BookmarkFolder): BookmarkFolder {
  return {
    ...folder,
    icons: [...folder.icons],
  };
}

function normalizeFolder(folder: BookmarkFolder): BookmarkFolder {
  return {
    ...folder,
    icon: folder.icon || "Folder",
    icons: Array.isArray(folder.icons) ? folder.icons : [],
  };
}

function normalizeFolders(folders: BookmarkFolder[]): BookmarkFolder[] {
  const normalizedFolders = folders.map(normalizeFolder);
  const favorites = normalizedFolders.find((folder) => folder.id === DEFAULT_FOLDER.id);
  const otherFolders = normalizedFolders.filter((folder) => folder.id !== DEFAULT_FOLDER.id);

  return [favorites ? cloneFolder(favorites) : cloneFolder(DEFAULT_FOLDER), ...otherFolders.map(cloneFolder)];
}

function validateFolderName(name: string, folders: BookmarkFolder[], excludeId?: string): string {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Please enter a folder name");
  }

  const hasDuplicate = folders.some(
    (folder) => folder.id !== excludeId && folder.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );

  if (hasDuplicate) {
    throw new Error(`A folder named "${trimmedName}" already exists`);
  }

  return trimmedName;
}

export async function loadBookmarkFolders(): Promise<BookmarkFolder[]> {
  const storedValue = await LocalStorage.getItem<string>(BOOKMARKS_KEY);

  if (!storedValue) {
    return [cloneFolder(DEFAULT_FOLDER)];
  }

  try {
    return normalizeFolders(JSON.parse(storedValue) as BookmarkFolder[]);
  } catch {
    return [cloneFolder(DEFAULT_FOLDER)];
  }
}

export async function saveBookmarkFolders(folders: BookmarkFolder[]): Promise<void> {
  await LocalStorage.setItem(BOOKMARKS_KEY, JSON.stringify(normalizeFolders(folders)));
}

export async function createBookmarkFolder({
  name,
  color,
  icon,
  initialIcons = [],
}: {
  name: string;
  color: string;
  icon: string;
  initialIcons?: HugeIcon[];
}): Promise<BookmarkFolder> {
  const folders = await loadBookmarkFolders();
  const trimmedName = validateFolderName(name, folders);
  const newFolder: BookmarkFolder = {
    id: `folder-${Date.now()}`,
    name: trimmedName,
    color,
    icon,
    icons: [...initialIcons],
  };

  await saveBookmarkFolders([...folders, newFolder]);

  return newFolder;
}

export async function updateBookmarkFolder(
  folderId: string,
  updates: Pick<BookmarkFolder, "name" | "color" | "icon">,
): Promise<BookmarkFolder> {
  const folders = await loadBookmarkFolders();
  const folderIndex = folders.findIndex((folder) => folder.id === folderId);

  if (folderIndex < 0) {
    throw new Error("Folder not found");
  }

  const trimmedName = validateFolderName(updates.name, folders, folderId);
  const updatedFolder: BookmarkFolder = {
    ...folders[folderIndex],
    ...updates,
    name: trimmedName,
  };
  const nextFolders = [...folders];
  nextFolders[folderIndex] = updatedFolder;

  await saveBookmarkFolders(nextFolders);

  return updatedFolder;
}

export async function deleteBookmarkFolder(folderId: string): Promise<void> {
  if (folderId === DEFAULT_FOLDER.id) {
    throw new Error("Cannot delete Favorites folder");
  }

  const folders = await loadBookmarkFolders();
  await saveBookmarkFolders(folders.filter((folder) => folder.id !== folderId));
}

export async function addIconToFolder(
  icon: HugeIcon,
  folderId: string,
): Promise<{ folder: BookmarkFolder; added: boolean }> {
  const folders = await loadBookmarkFolders();
  const folderIndex = folders.findIndex((folder) => folder.id === folderId);

  if (folderIndex < 0) {
    throw new Error("Folder not found");
  }

  const folder = cloneFolder(folders[folderIndex]);
  const alreadyExists = folder.icons.some((folderIcon) => folderIcon.name === icon.name);

  if (alreadyExists) {
    return { folder, added: false };
  }

  folder.icons.push(icon);
  const nextFolders = [...folders];
  nextFolders[folderIndex] = folder;
  await saveBookmarkFolders(nextFolders);

  return { folder, added: true };
}

export async function addIconsToFolder(
  icons: HugeIcon[],
  folderId: string,
): Promise<{ folder: BookmarkFolder; addedCount: number; skippedCount: number }> {
  const folders = await loadBookmarkFolders();
  const folderIndex = folders.findIndex((folder) => folder.id === folderId);

  if (folderIndex < 0) {
    throw new Error("Folder not found");
  }

  const folder = cloneFolder(folders[folderIndex]);
  const existingNames = new Set(folder.icons.map((icon) => icon.name));
  const uniqueIcons = icons.filter(
    (icon, index, array) => array.findIndex((entry) => entry.name === icon.name) === index,
  );
  const iconsToAdd = uniqueIcons.filter((icon) => !existingNames.has(icon.name));

  if (iconsToAdd.length === 0) {
    return { folder, addedCount: 0, skippedCount: uniqueIcons.length };
  }

  folder.icons.push(...iconsToAdd);
  const nextFolders = [...folders];
  nextFolders[folderIndex] = folder;
  await saveBookmarkFolders(nextFolders);

  return {
    folder,
    addedCount: iconsToAdd.length,
    skippedCount: uniqueIcons.length - iconsToAdd.length,
  };
}

export async function removeIconFromFolder(
  iconName: string,
  folderId: string,
): Promise<{ folder: BookmarkFolder; removed: boolean }> {
  const folders = await loadBookmarkFolders();
  const folderIndex = folders.findIndex((folder) => folder.id === folderId);

  if (folderIndex < 0) {
    throw new Error("Folder not found");
  }

  const folder = cloneFolder(folders[folderIndex]);
  const nextIcons = folder.icons.filter((icon) => icon.name !== iconName);
  const removed = nextIcons.length !== folder.icons.length;
  folder.icons = nextIcons;

  if (removed) {
    const nextFolders = [...folders];
    nextFolders[folderIndex] = folder;
    await saveBookmarkFolders(nextFolders);
  }

  return { folder, removed };
}

export function isIconInFolder(iconName: string, folderId: string, folders: BookmarkFolder[]): boolean {
  const folder = folders.find((currentFolder) => currentFolder.id === folderId);
  return folder?.icons.some((icon) => icon.name === iconName) ?? false;
}

export function findIconFolder(iconName: string, folders: BookmarkFolder[]): BookmarkFolder | undefined {
  return folders.find((folder) => folder.icons.some((icon) => icon.name === iconName));
}
