import { join } from "node:path";

import { LocalStorage, environment } from "@raycast/api";

import { LibraryStore } from "./library-store";

const LAST_OPENED_KEY = "lastOpenedBookId";

export function getLibraryStore(): LibraryStore {
  return new LibraryStore(join(environment.supportPath, "library"));
}

export async function rememberLastOpened(bookId: string): Promise<void> {
  await LocalStorage.setItem(LAST_OPENED_KEY, bookId);
}

export async function readLastOpened(): Promise<string | null> {
  const value = await LocalStorage.getItem<string>(LAST_OPENED_KEY);
  return typeof value === "string" ? value : null;
}

export async function forgetLastOpened(bookId: string): Promise<void> {
  if ((await readLastOpened()) === bookId) {
    await LocalStorage.removeItem(LAST_OPENED_KEY);
  }
}
