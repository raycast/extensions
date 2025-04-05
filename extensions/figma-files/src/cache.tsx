import { LocalStorage } from "@raycast/api";
import type { File, Node, TeamFiles } from "./types";

const PROJECT_FILES_CACHE_KEY = "PROJECT_FILES";
const PAGES_CACHE_KEY = "PAGES";

export function storeFiles(teamFiles: TeamFiles[]): void {
  const data = JSON.stringify(teamFiles);
  LocalStorage.setItem(PROJECT_FILES_CACHE_KEY, data);
}

export async function loadFiles() {
  const data: string | undefined = await LocalStorage.getItem(PROJECT_FILES_CACHE_KEY);
  return data !== undefined ? JSON.parse(data) : undefined;
}

export async function clearFiles(): Promise<void> {
  LocalStorage.removeItem(PROJECT_FILES_CACHE_KEY);
  await clearPagesCache();
}

async function clearPagesCache() {
  try {
    const items = await LocalStorage.allItems();
    // Find and remove all items that start with PAGES_CACHE_KEY-
    const promises = Object.keys(items)
      .filter((key) => key.startsWith(`${PAGES_CACHE_KEY}-`))
      .map((key) => LocalStorage.removeItem(key));
    await Promise.all(promises);
  } catch (error) {
    console.error("Error clearing pages cache:", error);
  }
}

export function storePages(pages: Node[], file: File): void {
  const data = JSON.stringify(pages);
  LocalStorage.setItem(`${PAGES_CACHE_KEY}-${file.key}`, data);
}

export async function loadPages(file: File) {
  const data: string | undefined = await LocalStorage.getItem(`${PAGES_CACHE_KEY}-${file.key}`);
  return data !== undefined ? JSON.parse(data) : undefined;
}
