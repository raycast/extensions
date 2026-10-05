import { LocalStorage } from "@raycast/api";
import { StorageKey, StorageValue, StorageValues } from "../types/storage";

Date.prototype.toJSON = function toJSON() {
  return JSON.stringify({ $date: this.toISOString() });
};

export function isJson(item: unknown): boolean {
  let value = typeof item !== "string" ? JSON.stringify(item) : item;
  try {
    value = JSON.parse(value);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }

  return typeof value === "object" && value !== null;
}

function reviver(key: string, value: unknown) {
  if (typeof value === "string" && isJson(value)) {
    const valueObject = JSON.parse(value);

    if (Object.hasOwn(valueObject, "$date")) {
      return new Date(valueObject.$date);
    }
  }

  return value;
}

export type UseStorageOptions<T extends StorageValue = StorageValue> = {
  key: StorageKey;
  initialValue?: T;
  options?: {
    parse?: boolean;
  };
};

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace StructuredStorage {
  export function deserialize<T extends StorageValue = StorageValue>(
    value?: LocalStorage.Value | undefined,
  ): T | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    return JSON.parse(value, reviver) as T;
  }

  export function serialize<T extends StorageValue = StorageValue>(value: T): string {
    return JSON.stringify(value);
  }

  export async function allItems(): Promise<{
    [key: string]: StorageValue | undefined;
  }> {
    const items = await LocalStorage.allItems();

    return Object.fromEntries(
      Object.entries(items).map(([key, value]) => {
        return [key, deserialize(value)];
      }),
    );
  }
  export async function getItem<T extends StorageValue>(key: StorageKey): Promise<T | undefined> {
    const rawValue = await LocalStorage.getItem(key);
    return deserialize<T>(rawValue);
  }
  export async function setItem<T extends StorageValue>(key: StorageKey, value: T): Promise<void> {
    await LocalStorage.setItem(key, serialize(value));
  }
  export async function removeItem(key: StorageKey): Promise<void> {
    await LocalStorage.removeItem(key);
  }
  export async function clear(): Promise<void> {
    await LocalStorage.clear();
  }

  export type Value = StorageValue;
  export type Values = StorageValues;
}
