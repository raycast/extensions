import { LocalStorage } from "@raycast/api";
import { Item } from "./types";

export async function getItems(): Promise<Item[]> {
  const { items } = await LocalStorage.allItems();
  if (!items) return [];

  return JSON.parse(items);
}

export async function saveItems(items: Item[]) {
  await LocalStorage.setItem("items", JSON.stringify(items));
}
