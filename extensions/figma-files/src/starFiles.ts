import { LocalStorage } from "@raycast/api";
import type { File } from "./types";
const STARRED_FILES_KEY = "starred-files";
const STARRED_FILES_LIMIT = 10;

export async function loadStarredFiles() {
  const item = await LocalStorage.getItem<string>(STARRED_FILES_KEY);
  if (item) {
    const parsed = JSON.parse(item) as File[];
    return parsed;
  }
  return [];
}

export async function saveStarredFile(file: File) {
  const parsedFiles = await loadStarredFiles();
  if (parsedFiles.length >= STARRED_FILES_LIMIT) {
    return;
  }
  parsedFiles.push(file);
  const data = JSON.stringify(parsedFiles);
  await LocalStorage.setItem(STARRED_FILES_KEY, data);
}

export async function removeStarredFile(file: File) {
  const parsedFiles = await loadStarredFiles();
  const nextFiles = parsedFiles.filter((item) => item.name !== file.name);
  const data = JSON.stringify(nextFiles);
  await LocalStorage.setItem(STARRED_FILES_KEY, data);
}
