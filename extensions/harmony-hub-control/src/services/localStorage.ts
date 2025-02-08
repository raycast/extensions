import { LocalStorage as RaycastLocalStorage } from "@raycast/api";
import { Logger } from "./logger";

export class LocalStorage {
  public static async getItem(key: string): Promise<string | null> {
    try {
      const value = await RaycastLocalStorage.getItem(key);
      return typeof value === "string" ? value : null;
    } catch (error) {
      Logger.error(`Failed to get item from storage: ${key}`, error);
      return null;
    }
  }

  public static async setItem(key: string, value: string): Promise<void> {
    try {
      await RaycastLocalStorage.setItem(key, value);
    } catch (error) {
      Logger.error(`Failed to set item in storage: ${key}`, error);
      throw error;
    }
  }

  public static async removeItem(key: string): Promise<void> {
    try {
      await RaycastLocalStorage.removeItem(key);
    } catch (error) {
      Logger.error(`Failed to remove item from storage: ${key}`, error);
      throw error;
    }
  }

  public static async clear(): Promise<void> {
    try {
      await RaycastLocalStorage.clear();
    } catch (error) {
      Logger.error("Failed to clear storage", error);
      throw error;
    }
  }
}
