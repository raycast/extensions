import { LocalStorage } from "@raycast/api";
import type { Item } from "./types";

const PREFIX = "item_";

export async function saveItem(
  item: Omit<Item, "id" | "created_at">,
): Promise<Item> {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const newItem: Item = { ...item, id, created_at };
  await LocalStorage.setItem(`${PREFIX}${id}`, JSON.stringify(newItem));
  return newItem;
}

export async function getItems(query?: string): Promise<Item[]> {
  const all = await LocalStorage.allItems();
  const items = Object.entries(all)
    .filter(([key]) => key.startsWith(PREFIX))
    .map(([, value]) => JSON.parse(value as string) as Item)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!query?.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    (i) =>
      i.content.toLowerCase().includes(q) ||
      i.title.toLowerCase().includes(q) ||
      i.tags.toLowerCase().includes(q),
  );
}

export async function deleteItem(id: string): Promise<void> {
  await LocalStorage.removeItem(`${PREFIX}${id}`);
}

export async function updateItem(
  id: string,
  patch: Partial<Item>,
): Promise<void> {
  const raw = await LocalStorage.getItem<string>(`${PREFIX}${id}`);
  if (!raw) return;
  const merged = { ...(JSON.parse(raw) as Item), ...patch };
  await LocalStorage.setItem(`${PREFIX}${id}`, JSON.stringify(merged));
}
