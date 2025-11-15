import { LocalStorage } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { RecentTOON } from "../types";

const STORAGE_KEY = "recent_toons";
const MAX_RECENT_ITEMS = 50;

export async function saveRecent(toon: string, original: string, format: "json" | "yaml"): Promise<void> {
  const recent = await getRecent();

  const newItem: RecentTOON = {
    id: uuidv4(),
    toon,
    original,
    format,
    timestamp: Date.now(),
  };

  // Add to beginning and limit to MAX_RECENT_ITEMS
  const updated = [newItem, ...recent].slice(0, MAX_RECENT_ITEMS);

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function getRecent(): Promise<RecentTOON[]> {
  try {
    const data = await LocalStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function deleteRecent(id: string): Promise<void> {
  const recent = await getRecent();
  const filtered = recent.filter((item) => item.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function clearAll(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

export function getPreview(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "…";
}
