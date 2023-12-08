import { IconStorageItem } from "./types";
import { LocalStorage } from "@raycast/api";

enum DbKeys {
  History = "[History]",
}

async function getAllEntries<T>(keyFilter?: (key: string) => boolean) {
  const items = await LocalStorage.allItems();
  return Object.entries(items).reduce(
    (acc, [key, value]) => {
      if (keyFilter && !keyFilter(key)) {
        return acc;
      }

      acc[key] = JSON.parse(value);
      return acc;
    },
    {} as { [key: string]: T },
  );
}

export async function getEntry(key: string) {
  const items = await LocalStorage.getItem<string>(key);

  return items ? JSON.parse(items) : [];
}

async function addEntry(key: string, item: IconStorageItem) {
  const items = await getEntry(key);
  items.push(item);

  await LocalStorage.setItem(key, JSON.stringify(items));
  return items;
}

async function addToHistory(bundleId: string, icon: IconStorageItem) {
  return addEntry(`${bundleId}${DbKeys.History}`, icon);
}

async function removeFromHistory(
  bundleId: string,
  icon: IconStorageItem,
): Promise<boolean> {
  const key = `${bundleId}${DbKeys.History}`;
  const items = await getEntry(key);
  const newItems = items.filter(
    (item: IconStorageItem) => item.date !== icon.date,
  );

  await LocalStorage.setItem(key, JSON.stringify(newItems));

  return newItems.length !== items.length;
}

async function getHistory() {
  const allItems = await getAllEntries<IconStorageItem[]>((key) =>
    key.endsWith(`${DbKeys.History}`),
  );

  return Object.entries(allItems).reduce(
    (acc, [key, value]) => {
      acc[key.replace(DbKeys.History, "")] = value.reverse();
      return acc;
    },
    {} as { [bundleId: string]: IconStorageItem[] },
  );
}

export const DB = {
  getHistory,
  addToHistory,
  removeFromHistory,
};
