import { LocalStorage } from "@raycast/api";

import { ValidationError } from "../domain/errors";
import {
  LEGACY_SEARCH_PROJECT_FILTER_KEY,
  SEARCH_FILTERS_STORAGE_KEY,
  type TaskFilterStoragePort,
} from "./taskFilterPreferences";

export type RaycastTaskFilterLocalStoragePort = Pick<typeof LocalStorage, "getItem" | "setItem" | "removeItem">;

const UNSUPPORTED_STORAGE_OPERATION_MESSAGE = "Unsupported task-filter storage operation.";

function requireReadableKey(key: string): void {
  if (key !== SEARCH_FILTERS_STORAGE_KEY && key !== LEGACY_SEARCH_PROJECT_FILTER_KEY) {
    throw new ValidationError(UNSUPPORTED_STORAGE_OPERATION_MESSAGE);
  }
}

function requireWritableKey(key: string): void {
  if (key !== SEARCH_FILTERS_STORAGE_KEY) {
    throw new ValidationError(UNSUPPORTED_STORAGE_OPERATION_MESSAGE);
  }
}

export class RaycastTaskFilterStorage implements TaskFilterStoragePort {
  constructor(private readonly storage: RaycastTaskFilterLocalStoragePort) {}

  async getItem(key: string): Promise<string | undefined> {
    requireReadableKey(key);
    const value = await this.storage.getItem(key);
    return typeof value === "string" ? value : undefined;
  }

  async setItem(key: string, value: string): Promise<void> {
    requireWritableKey(key);
    await this.storage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    requireReadableKey(key);
    await this.storage.removeItem(key);
  }
}

export function createRaycastTaskFilterStorage(storage: RaycastTaskFilterLocalStoragePort): RaycastTaskFilterStorage {
  return new RaycastTaskFilterStorage(storage);
}

export const raycastTaskFilterStorage = createRaycastTaskFilterStorage(LocalStorage);
