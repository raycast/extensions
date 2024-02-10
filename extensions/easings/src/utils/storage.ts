import { LocalStorage } from "@raycast/api";

export type Item = {
  name: string;
  easing: string;
};

export async function getItems(key = "easings"): Promise<Item[]> {
  const items = await LocalStorage.getItem<string>(key);
  if (!items) return [];

  return JSON.parse(items);
}

export async function saveItems(items: Item[], key = "easings") {
  await LocalStorage.setItem(key, JSON.stringify(items));
}

export async function addItem(item: Item, key = "easings") {
  let items = await getItems(key);

  const alreadyExists = items.find((i) => i.name === item.name);
  if (alreadyExists) {
    items = items.map((i) => {
      return i.name === item.name ? item : i;
    });
  } else {
    items.push(item);
  }

  await saveItems(items, key);
  return items;
}
