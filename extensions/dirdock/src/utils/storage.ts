// src/utils/storage.ts
import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "dirdock_directories";

export interface Directory {
  id: string;
  path: string;
  name: string;
}

export async function getDirectories(): Promise<Directory[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addDirectory(dir: Directory): Promise<void> {
  const dirs = await getDirectories();
  dirs.push(dir);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(dirs));
}

export async function removeDirectory(dirId: string): Promise<void> {
  const dirs = await getDirectories();
  const updatedDirs = dirs.filter((dir) => dir.id !== dirId);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDirs));
}

export async function clearDirectories(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
