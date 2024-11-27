import { LocalStorage } from "@raycast/api";
import { isObject } from "../utils/storage";
import { StorageKeyType, StructuredValue } from "../types/storage";
import Value = LocalStorage.Value;

export const Storage = {
  async get<T extends StructuredValue = StructuredValue>(key: StorageKeyType, fallback?: T): Promise<T> {
    const value = await LocalStorage.getItem(key);

    if (value == null || typeof value !== "string") {
      return fallback ?? ({} as T);
    }

    return JSON.parse(value as string) as T;
  },

  async set<T extends StructuredValue = StructuredValue>(
    key: StorageKeyType,
    value: T,
    options: {
      parse: boolean;
    } = { parse: true },
  ): Promise<void> {
    let parsedValue: Value;

    if (options.parse || isObject(value)) {
      parsedValue = JSON.stringify(value);
    } else {
      parsedValue = value as unknown as Value;
    }

    await LocalStorage.setItem(key, parsedValue);
  },

  async remove(key: StorageKeyType): Promise<void> {
    await LocalStorage.removeItem(key);
  },
};
