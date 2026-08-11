import type { ItemDetails, ItemSummary } from "./item";
const STORAGE_KEY = "items.cache";
export type ItemMetadata = { username?: string; email?: string; urls: string[]; hasTotp: boolean; modifyTime?: string };
export type ItemMetadataMap = Record<string, ItemMetadata>;
export type ItemCache = { items: ItemSummary[]; metadata: ItemMetadataMap };
export function metadataFrom(details: ItemDetails, modifyTime?: string): ItemMetadata {
  return {
    username: details.type === "login" ? details.username : undefined,
    email: details.email,
    urls: details.type === "login" ? details.urls : [],
    hasTotp: details.type === "login" && details.hasTotp,
    modifyTime,
  };
}
type Storage = {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
};

export function createItemCache(storage: Storage) {
  return {
    async read(): Promise<ItemCache | undefined> {
      const value = await storage.getItem(STORAGE_KEY);
      if (!value) return undefined;
      try {
        return JSON.parse(value) as ItemCache;
      } catch {
        return undefined;
      }
    },
    async write(value: ItemCache) {
      await storage.setItem(STORAGE_KEY, JSON.stringify(value));
    },
  };
}
