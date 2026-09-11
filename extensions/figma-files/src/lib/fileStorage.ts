import { LocalStorage } from "@raycast/api";
import type { File } from "../types";

// Configuration for different file collections
export type FileCollectionConfig = {
  storageKey: string;
  maxItems: number;
  cacheKey: string;
  displayName: string;
};

export const STARRED_CONFIG: FileCollectionConfig = {
  storageKey: "starred-files",
  maxItems: 10,
  cacheKey: "starredFiles",
  displayName: "starred",
};

export const VISITED_CONFIG: FileCollectionConfig = {
  storageKey: "VISITED_FIGMA_FILES",
  maxItems: 5,
  cacheKey: "visitedFiles",
  displayName: "visited",
};

// Configuration for API data
export const PROJECT_FILES_CONFIG: FileCollectionConfig = {
  storageKey: "PROJECT_FILES",
  maxItems: 1,
  cacheKey: "projectFiles",
  displayName: "project files",
};

export async function loadFileCollection(config: FileCollectionConfig): Promise<File[]> {
  const item = await LocalStorage.getItem<string>(config.storageKey);
  if (item) {
    try {
      const parsed = JSON.parse(item) as File[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function saveFileCollection(config: FileCollectionConfig, files: File[]): Promise<void> {
  const data = JSON.stringify(files);
  await LocalStorage.setItem(config.storageKey, data);
}

export async function addFileToCollection(config: FileCollectionConfig, file: File): Promise<void> {
  const existingFiles = await loadFileCollection(config);

  // Remove existing file with same key to prevent duplicates
  const filteredFiles = existingFiles.filter((item) => item.key !== file.key);

  // Add new file at the beginning
  const nextFiles = [file, ...filteredFiles].slice(0, config.maxItems);
  await saveFileCollection(config, nextFiles);
}

export async function removeFileFromCollection(config: FileCollectionConfig, file: File): Promise<void> {
  const existingFiles = await loadFileCollection(config);

  const nextFiles = existingFiles.filter((item) => item.key !== file.key);
  await saveFileCollection(config, nextFiles);
}

export async function clearVisitedFiles(): Promise<void> {
  return await LocalStorage.removeItem(VISITED_CONFIG.storageKey);
}

export async function loadStarredFiles(): Promise<File[]> {
  return await loadFileCollection(STARRED_CONFIG);
}

export async function saveStarredFile(file: File): Promise<void> {
  return await addFileToCollection(STARRED_CONFIG, file);
}

export async function removeStarredFile(file: File): Promise<void> {
  return await removeFileFromCollection(STARRED_CONFIG, file);
}
