import { LocalStorage as RaycastLocalStorage } from "@raycast/api";

import { error } from "./logger";

export class LocalStorage {
  public static async getItem(key: string): Promise<string | null> {
    try {
      const value = await RaycastLocalStorage.getItem(key);
      return typeof value === "string" ? value : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error(`Failed to get item from storage: ${key}`, { error: errorMessage });
      return null;
    }
  }

  public static async setItem(key: string, value: string): Promise<void> {
    try {
      await RaycastLocalStorage.setItem(key, value);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error(`Failed to set item in storage: ${key}`, { error: errorMessage });
      throw err;
    }
  }

  public static async removeItem(key: string): Promise<void> {
    try {
      await RaycastLocalStorage.removeItem(key);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error(`Failed to remove item from storage: ${key}`, { error: errorMessage });
      throw err;
    }
  }

  public static async clear(): Promise<void> {
    try {
      await RaycastLocalStorage.clear();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error("Failed to clear storage", { error: errorMessage });
      throw err;
    }
  }
}
