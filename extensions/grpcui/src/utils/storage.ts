import { LocalStorage } from "@raycast/api";

export const getServices = async () => {
  const items = await LocalStorage.allItems();
  return Object.fromEntries(Object.entries(items).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
};

export const saveService = async (title: string, url: string) => {
  await LocalStorage.setItem(title, url);
};

export const deleteService = async (title: string) => {
  await LocalStorage.removeItem(title);
};
