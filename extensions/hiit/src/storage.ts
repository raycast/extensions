import { LocalStorage } from "@raycast/api";
import { Item } from "./types";
import { DEFAULT_KEY } from "./constants";

export async function getItems(key = DEFAULT_KEY): Promise<Item[]> {
  const items = await LocalStorage.getItem<string>(key);
  if (!items) return [];

  return JSON.parse(items);
}

export async function saveItems(items: Item[], key = DEFAULT_KEY) {
  await LocalStorage.setItem(key, JSON.stringify(items));
}

export async function addItem(item: Item, key = DEFAULT_KEY) {
  let items = await getItems(key);

  const alreadyExists = items.find((i) => i.id === item.id);
  if (alreadyExists) {
    items = items.map((i) => {
      return i.id === item.id ? item : i;
    });
  } else {
    items.push(item);
  }

  await saveItems(items, key);
  return items;
}

export async function deleteItem(item: Item, key = DEFAULT_KEY) {
  let items = await getItems(key);
  items = items.filter((i) => i.id !== item.id);
  await saveItems(items, key);
  return items;
}
