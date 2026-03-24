import { LocalStorage } from "@raycast/api";
import { ShelfItem, ShelfItemWithStatus } from "./types";
import { statSync, existsSync } from "fs";
import { basename } from "path";

const SHELF_KEY = "shelf-items";

export async function getShelfItems(): Promise<ShelfItem[]> {
  const data = await LocalStorage.getItem<string>(SHELF_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as ShelfItem[];
  } catch {
    return [];
  }
}

export function validateShelfItems(items: ShelfItem[]): ShelfItemWithStatus[] {
  return items.map((item) => {
    try {
      statSync(item.path);
      return { ...item, isStale: false };
    } catch {
      const staleReason = existsSync(item.path) ? "inaccessible" : "deleted";
      return { ...item, isStale: true, staleReason };
    }
  });
}

export async function removeStaleItems(): Promise<number> {
  const items = await getShelfItems();
  const validItems = items.filter((item) => {
    try {
      statSync(item.path);
      return true;
    } catch {
      return false;
    }
  });
  const removedCount = items.length - validItems.length;
  if (removedCount > 0) {
    await LocalStorage.setItem(SHELF_KEY, JSON.stringify(validItems));
  }
  return removedCount;
}

export async function addToShelf(paths: string[]): Promise<{ added: number; duplicates: number }> {
  const existing = await getShelfItems();
  const existingPaths = new Set(existing.map((item) => item.path));

  let added = 0;
  let duplicates = 0;

  for (const path of paths) {
    if (existingPaths.has(path)) {
      duplicates++;
      continue;
    }

    try {
      const stat = statSync(path);
      const item: ShelfItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: basename(path),
        path: path,
        type: stat.isDirectory() ? "folder" : "file",
      };
      existing.push(item);
      existingPaths.add(path);
      added++;
    } catch {
      // Skip files that don't exist or can't be accessed
    }
  }

  await LocalStorage.setItem(SHELF_KEY, JSON.stringify(existing));
  return { added, duplicates };
}

export async function removeFromShelf(id: string): Promise<void> {
  const items = await getShelfItems();
  const filtered = items.filter((item) => item.id !== id);
  await LocalStorage.setItem(SHELF_KEY, JSON.stringify(filtered));
}

export async function clearShelf(): Promise<void> {
  await LocalStorage.removeItem(SHELF_KEY);
}

export async function updateShelfItem(id: string, updates: Partial<ShelfItem>): Promise<void> {
  const items = await getShelfItems();
  const index = items.findIndex((item) => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    await LocalStorage.setItem(SHELF_KEY, JSON.stringify(items));
  }
}

export async function updateShelfItems(updatedItems: ShelfItem[]): Promise<void> {
  await LocalStorage.setItem(SHELF_KEY, JSON.stringify(updatedItems));
}
