import { LocalStorage } from "@raycast/api";

import { ValidationError } from "../domain/errors";
import {
  LEGACY_DEFAULT_DESTINATION_KEY,
  TASK_DESTINATION_STORAGE_PREFIX,
  type TaskDestinationStoragePort,
} from "./taskDestinationPreferences";

export type RaycastTaskDestinationLocalStoragePort = Pick<typeof LocalStorage, "getItem" | "setItem" | "removeItem">;

const UNSUPPORTED_STORAGE_OPERATION_MESSAGE = "Unsupported task-destination storage operation.";
const SCOPED_KEY_PATTERN = new RegExp(
  `^${TASK_DESTINATION_STORAGE_PREFIX.replaceAll(".", "\\.")}\\.(?:mcp|openapi|macos-legacy)\\.[0-9a-f]{64}$`
);

export class RaycastTaskDestinationStorage implements TaskDestinationStoragePort {
  constructor(private readonly storage: RaycastTaskDestinationLocalStoragePort) {}

  async getItem(key: string): Promise<string | undefined> {
    requireReadableKey(key);
    const value = await this.storage.getItem(key);
    return typeof value === "string" ? value : undefined;
  }

  async setItem(key: string, value: string): Promise<void> {
    requireScopedKey(key);
    requireStringValue(value);
    await this.storage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    requireReadableKey(key);
    await this.storage.removeItem(key);
  }
}

export function createRaycastTaskDestinationStorage(
  storage: RaycastTaskDestinationLocalStoragePort
): RaycastTaskDestinationStorage {
  return new RaycastTaskDestinationStorage(storage);
}

export const raycastTaskDestinationStorage = createRaycastTaskDestinationStorage(LocalStorage);

function requireReadableKey(key: string): void {
  if (key !== LEGACY_DEFAULT_DESTINATION_KEY) requireScopedKey(key);
}

function requireScopedKey(key: string): void {
  if (typeof key !== "string" || !SCOPED_KEY_PATTERN.test(key)) {
    throw new ValidationError(UNSUPPORTED_STORAGE_OPERATION_MESSAGE);
  }
}

function requireStringValue(value: unknown): asserts value is string {
  if (typeof value !== "string") throw new ValidationError(UNSUPPORTED_STORAGE_OPERATION_MESSAGE);
}
