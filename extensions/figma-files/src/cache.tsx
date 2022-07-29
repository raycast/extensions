import { setLocalStorageItem, getLocalStorageItem, removeLocalStorageItem } from "@raycast/api";
import type { File, ProjectFiles, Node } from "./types";

const PROJECT_FILES_CACHE_KEY = "PROJECT_FILES";
const PAGES_CACHE_KEY = "PAGES";

export async function storeFiles(projectFiles: ProjectFiles[]) {
  const data = JSON.stringify(projectFiles);
  await setLocalStorageItem(PROJECT_FILES_CACHE_KEY, data);
}

export async function loadFiles() {
  const data: string | undefined = await getLocalStorageItem(PROJECT_FILES_CACHE_KEY);
  return data !== undefined ? JSON.parse(data) : undefined;
}

export async function clearFiles() {
  return await removeLocalStorageItem(PROJECT_FILES_CACHE_KEY);
}

export async function storePages(pages: Node[], file: File) {
  const data = JSON.stringify(pages);
  await setLocalStorageItem(`${PAGES_CACHE_KEY}-${file.key}`, data);
}

export async function loadPages(file: File) {
  const data: string | undefined = await getLocalStorageItem(`${PAGES_CACHE_KEY}-${file.key}`);
  return data !== undefined ? JSON.parse(data) : undefined;
}
