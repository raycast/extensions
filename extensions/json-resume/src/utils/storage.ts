import { LocalStorage } from "@raycast/api";

const KEY = "savedResumes";

export interface SavedResume {
  url: string;
  title?: string;
  lastFetched?: string; // ISO string
}

export async function getSavedResumes(): Promise<SavedResume[]> {
  try {
    const raw = await LocalStorage.getItem<string>(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedResume[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export async function saveResume(url: string, title?: string): Promise<void> {
  if (!url) return;
  const list = await getSavedResumes();
  const now = new Date().toISOString();
  const existingIndex = list.findIndex((r) => r.url === url);
  if (existingIndex >= 0) {
    list[existingIndex] = {
      ...list[existingIndex],
      title: title || list[existingIndex].title,
      lastFetched: now,
    };
  } else {
    list.unshift({ url, title, lastFetched: now });
  }
  await LocalStorage.setItem(KEY, JSON.stringify(list));
}

export async function removeResume(url: string): Promise<void> {
  if (!url) return;
  const list = await getSavedResumes();
  const filtered = list.filter((r) => r.url !== url);
  await LocalStorage.setItem(KEY, JSON.stringify(filtered));
}

export async function clearSavedResumes(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}
