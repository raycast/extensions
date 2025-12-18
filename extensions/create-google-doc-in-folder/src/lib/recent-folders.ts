import { LocalStorage } from "@raycast/api";
import type { GoogleFolder } from "../types";

const RECENT_FOLDERS_KEY = "recent-folders";
const MAX_RECENT_FOLDERS = 20;

export interface RecentFolder {
  id: string;
  name: string;
  lastUsed: number;
}

export async function getRecentFolders(): Promise<RecentFolder[]> {
  const stored = await LocalStorage.getItem<string>(RECENT_FOLDERS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as RecentFolder[];
  } catch {
    return [];
  }
}

export async function addRecentFolder(folder: GoogleFolder): Promise<void> {
  const recent = await getRecentFolders();

  // Remove if already exists
  const filtered = recent.filter((f) => f.id !== folder.id);

  // Add to front with current timestamp
  filtered.unshift({
    id: folder.id,
    name: folder.name,
    lastUsed: Date.now(),
  });

  // Keep only max items
  const trimmed = filtered.slice(0, MAX_RECENT_FOLDERS);

  await LocalStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(trimmed));
}
