import { LocalStorage } from "@raycast/api";
import { Item } from "./types";

export async function getItems(): Promise<Item[]> {
  const items = await LocalStorage.getItem<string>("items");
  if (!items) return [];

  return JSON.parse(items);
}

export async function saveItems(items: Item[]) {
  await LocalStorage.setItem("items", JSON.stringify(items));
}

export async function addItem(item: Item) {
  let items = await getItems();

  const alreadyExists = items.find((i) => i.id === item.id);
  if (alreadyExists) {
    items = items.map((i) => {
      return i.id === item.id ? item : i;
    });
  } else {
    items.push(item);
  }

  await saveItems(items);
  return items;
}
