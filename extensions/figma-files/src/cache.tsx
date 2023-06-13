import { LocalStorage } from "@raycast/api";
import type { File, Node, TeamFiles } from "./types";

const PROJECT_FILES_CACHE_KEY = "PROJECT_FILES";
const PAGES_CACHE_KEY = "PAGES";

export async function storeFiles(teamFiles: TeamFiles[]) {
  const data = JSON.stringify(teamFiles);
  await LocalStorage.setItem(PROJECT_FILES_CACHE_KEY, data);
}

export async function loadFiles() {
  const data: string | undefined = await LocalStorage.getItem(PROJECT_FILES_CACHE_KEY);
  return data !== undefined ? JSON.parse(data) : undefined;
}

export async function clearFiles() {
  return await LocalStorage.removeItem(PROJECT_FILES_CACHE_KEY);
}

export async function storePages(pages: Node[], file: File) {
  const data = JSON.stringify(pages);
  await LocalStorage.setItem(`${PAGES_CACHE_KEY}-${file.key}`, data);
}

export async function loadPages(file: File) {
  const data: string | undefined = await LocalStorage.getItem(`${PAGES_CACHE_KEY}-${file.key}`);
  return data !== undefined ? JSON.parse(data) : undefined;
}
