import { LocalStorage } from "@raycast/api";
import subHours from "date-fns/subHours";

interface CachedItem<T> {
  lastUpdate: Date;
  item: T;
}

export class LocalStorageService {
  private static async getItem<T extends object>(key: string): Promise<CachedItem<T> | undefined> {
    const item = await LocalStorage.getItem<string>(key);
    if (!item) {
      return undefined;
    }

    const parsedObject: CachedItem<T> = JSON.parse(item);
    return { item: parsedObject.item, lastUpdate: new Date(parsedObject.lastUpdate) };
  }

  private static async setItem<T extends object>(key: string, obj: CachedItem<T>): Promise<void> {
    const item = JSON.stringify(obj);
    await LocalStorage.setItem(key, item);
  }

  // Uses cached item if it exists and if it's not older than 6 hours
  public static async get<T extends object>(key: string, method: () => Promise<T>): Promise<T | undefined> {
    const cachedItem = await LocalStorageService.getItem<T>(key);

    const now = new Date();

    let item: T | undefined;
    if (!cachedItem || cachedItem.lastUpdate.getTime() < subHours(now, 6).getTime()) {
      // Set cached item anyways if api call failed
      try {
        item = await method();
        LocalStorageService.setItem<T>(key, { lastUpdate: new Date(), item });
      } catch {
        item = cachedItem?.item;
      }
    } else {
      item = cachedItem.item;
    }

    return item;
  }
}
