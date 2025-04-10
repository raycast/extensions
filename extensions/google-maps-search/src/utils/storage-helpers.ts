import { LocalStorage } from "@raycast/api";

/**
 * Type for values that can be stored in LocalStorage
 * LocalStorage can store strings, numbers, booleans, and objects that can be serialized to JSON
 */
export type StorageValue = string | number | boolean | object;

/**
 * Gets an item from LocalStorage with error handling
 * @param key The key to retrieve
 * @param defaultValue Optional default value if the key doesn't exist or an error occurs
 * @returns The stored value or the default value
 */
export async function getStorageItem<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  try {
    const value = await LocalStorage.getItem(key);
    if (value === undefined) {
      return defaultValue;
    }
    return typeof value === "string" ? (JSON.parse(value) as T) : (value as unknown as T);
  } catch (error) {
    console.error(`Failed to get item from storage: ${key}`, error);
    return defaultValue;
  }
}

/**
 * Sets an item in LocalStorage with error handling
 * @param key The key to set
 * @param value The value to store
 * @returns True if successful, false if an error occurred
 */
export async function setStorageItem(key: string, value: StorageValue): Promise<boolean> {
  try {
    const valueToStore = typeof value === "object" ? JSON.stringify(value) : value;
    await LocalStorage.setItem(key, valueToStore);
    return true;
  } catch (error) {
    console.error(`Failed to save item to storage: ${key}`, error);
    return false;
  }
}

/**
 * Removes an item from LocalStorage with error handling
 * @param key The key to remove
 * @returns True if successful, false if an error occurred
 */
export async function removeStorageItem(key: string): Promise<boolean> {
  try {
    await LocalStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove item from storage: ${key}`, error);
    return false;
  }
}

/**
 * Saves multiple items to LocalStorage in a batch with error handling
 * @param items Object with keys and values to store
 * @returns True if all items were saved successfully, false if any errors occurred
 */
export async function batchSetStorageItems(items: Record<string, StorageValue>): Promise<boolean> {
  try {
    await Promise.all(
      Object.entries(items).map(([key, value]) => {
        const valueToStore = typeof value === "object" ? JSON.stringify(value) : value;
        return LocalStorage.setItem(key, valueToStore);
      })
    );
    return true;
  } catch (error) {
    console.error("Failed to save items to storage", error);
    return false;
  }
}
