import { LocalStorage } from "@raycast/api";
import { PageSpeedData } from "./types";
const MAX_ITEMS = 10;

export const getAllItems = async () => {
  let items = [] as PageSpeedData[];
  const localItems = await LocalStorage.getItem("items");
  try {
    if (localItems) {
      items = JSON.parse(localItems as string) as PageSpeedData[];
    }
  } catch (_ignore) {
    // ignore
  }
  return items;
};
export const addItem = async (data: PageSpeedData) => {
  let items = await getAllItems();
  const filtered = items.filter((i) => i.url !== data.url);
  items = [data, ...filtered].slice(0, MAX_ITEMS);
  await LocalStorage.setItem("items", JSON.stringify(items));
  return items;
};

export const removeItem = async (url: string) => {
  let items = await getAllItems();
  items = items.filter((i) => i.url !== url);
  await LocalStorage.setItem("items", JSON.stringify(items));
};

export const clearAllItems = async () => {
  await LocalStorage.removeItem("items");
};
