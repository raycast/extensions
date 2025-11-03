import { LocalStorage } from "@raycast/api";

const BIBLE_VERSION_KEY = "bibleVersion";

export async function fetchBibleVersion(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(BIBLE_VERSION_KEY);
}

export async function storeBibleVersion(version: string): Promise<void> {
  await LocalStorage.setItem(BIBLE_VERSION_KEY, version);
}
