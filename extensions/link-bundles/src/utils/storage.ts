import { LocalStorage } from "@raycast/api";
import { Bundle } from "../types";

const STORAGE_KEY = "link-bundles";

export const loadBundles = async (): Promise<Bundle[]> => {
  try {
    const data = await LocalStorage.getItem<string>(STORAGE_KEY);
    return JSON.parse(data ?? "[]");
  } catch (error) {
    console.error("Failed to load bundles:", error);
    return [];
  }
};

export const saveBundles = async (bundles: Bundle[]): Promise<void> => {
  try {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(bundles));
  } catch (error) {
    console.error("Failed to save bundles:", error);
  }
};
