import { LocalStorage } from "@raycast/api";

export const getItemFromLocalStore = async <T>(key: string): Promise<T | null> => {
  const item = await LocalStorage.getItem<string>(key);
  if (item != undefined) {
    try {
      return JSON.parse(item);
    } catch (error) {
      throw new Error(`Error parsing ${key}: ${error}`);
    }
  } else {
    return Promise.resolve(null);
  }
};

export const clearLocalStore = async (): Promise<void> => {
  await LocalStorage.clear();
};
