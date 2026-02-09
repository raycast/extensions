/**
 * Raycast LocalStorage adapter for the Odoo API package
 */

import { LocalStorage } from "@raycast/api";
import type { StorageProvider } from "../utils/odoo";

export const raycastStorage: StorageProvider = {
  async getItem(key: string): Promise<string | null> {
    const value = await LocalStorage.getItem<string>(key);
    return value ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await LocalStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await LocalStorage.removeItem(key);
  },
};
