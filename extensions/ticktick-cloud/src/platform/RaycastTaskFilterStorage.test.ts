import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { LocalStorage } from "@raycast/api";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { ValidationError } from "../domain/errors";
import {
  createRaycastTaskFilterStorage,
  RaycastTaskFilterStorage,
  raycastTaskFilterStorage,
  type RaycastTaskFilterLocalStoragePort,
} from "./RaycastTaskFilterStorage";
import {
  LEGACY_SEARCH_PROJECT_FILTER_KEY,
  SEARCH_FILTERS_STORAGE_KEY,
  type TaskFilterStoragePort,
} from "./taskFilterPreferences";

const localStorageMock = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@raycast/api", () => ({ LocalStorage: localStorageMock }));

const SAFE_VALIDATION_MESSAGE = "Unsupported task-filter storage operation.";

function adapter(): RaycastTaskFilterStorage {
  return createRaycastTaskFilterStorage(localStorageMock as unknown as RaycastTaskFilterLocalStoragePort);
}

beforeEach(() => {
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
});

describe("RaycastTaskFilterStorage", () => {
  it("is statically compatible with the accepted preference port and installed Raycast signatures", () => {
    expectTypeOf<RaycastTaskFilterStorage>().toMatchTypeOf<TaskFilterStoragePort>();
    expectTypeOf<RaycastTaskFilterLocalStoragePort>().toEqualTypeOf<
      Pick<typeof LocalStorage, "getItem" | "setItem" | "removeItem">
    >();
    expectTypeOf(raycastTaskFilterStorage).toMatchTypeOf<TaskFilterStoragePort>();
  });

  it.each([SEARCH_FILTERS_STORAGE_KEY, LEGACY_SEARCH_PROJECT_FILTER_KEY])(
    "reads the allowed key exactly once: %s",
    async (key) => {
      localStorageMock.getItem.mockResolvedValue("stored-value");

      await expect(adapter().getItem(key)).resolves.toBe("stored-value");
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(key);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    }
  );

  it("writes only the atomic key exactly once without inspecting or serializing its value", async () => {
    const value = '{"status":"completed","projectId":"opaque-project"}';
    localStorageMock.setItem.mockResolvedValue(undefined);

    await expect(adapter().setItem(SEARCH_FILTERS_STORAGE_KEY, value)).resolves.toBeUndefined();
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(SEARCH_FILTERS_STORAGE_KEY, value);
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it.each([SEARCH_FILTERS_STORAGE_KEY, LEGACY_SEARCH_PROJECT_FILTER_KEY])(
    "removes the allowed key exactly once: %s",
    async (key) => {
      localStorageMock.removeItem.mockResolvedValue(undefined);

      await expect(adapter().removeItem(key)).resolves.toBeUndefined();
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(1);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(key);
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    }
  );

  it.each([
    [undefined, undefined],
    ["text", "text"],
    [0, undefined],
    [42, undefined],
    [false, undefined],
    [true, undefined],
    [{ private: "PRIVATE-MARKER-object-value" }, undefined],
  ])("returns only strings or undefined for a runtime LocalStorage value %#", async (stored, expected) => {
    localStorageMock.getItem.mockResolvedValue(stored);

    await expect(adapter().getItem(SEARCH_FILTERS_STORAGE_KEY)).resolves.toBe(expected);
    expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["read", (storage: RaycastTaskFilterStorage, key: string) => storage.getItem(key)],
    ["write", (storage: RaycastTaskFilterStorage, key: string) => storage.setItem(key, "private-value")],
    ["remove", (storage: RaycastTaskFilterStorage, key: string) => storage.removeItem(key)],
  ] as const)("rejects an unsupported %s key with one fixed non-reflective ValidationError", async (_name, invoke) => {
    const marker = "PRIVATE-MARKER-hostile-storage-key";
    let thrown: unknown;
    try {
      await invoke(adapter(), marker);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ValidationError);
    expect(thrown).toMatchObject({
      name: "ValidationError",
      code: "validation",
      retryable: false,
      message: SAFE_VALIDATION_MESSAGE,
    });
    expect(String((thrown as Error).message)).not.toContain(marker);
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it("allows reading/removing the legacy key but never writing it", async () => {
    localStorageMock.setItem.mockResolvedValue(undefined);

    await expect(adapter().setItem(LEGACY_SEARCH_PROJECT_FILTER_KEY, "legacy-project")).rejects.toMatchObject({
      name: "ValidationError",
      message: SAFE_VALIDATION_MESSAGE,
    });
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("does not coerce or leak hostile runtime-cast keys and values", async () => {
    const marker = "PRIVATE-MARKER-hostile-key-or-value";
    let keyReads = 0;
    let valueReads = 0;
    const hostileKey = Object.defineProperty({}, "toString", {
      get() {
        keyReads += 1;
        throw new Error(marker);
      },
    }) as unknown as string;
    const hostileValue = Object.defineProperty({}, "toString", {
      get() {
        valueReads += 1;
        throw new Error(marker);
      },
    }) as unknown as string;

    let thrown: unknown;
    try {
      await adapter().setItem(hostileKey, hostileValue);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ValidationError);
    expect((thrown as Error).message).toBe(SAFE_VALIDATION_MESSAGE);
    expect((thrown as Error).message).not.toContain(marker);
    expect(keyReads).toBe(0);
    expect(valueReads).toBe(0);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it.each([
    ["getItem", (storage: RaycastTaskFilterStorage) => storage.getItem(SEARCH_FILTERS_STORAGE_KEY)],
    [
      "setItem",
      (storage: RaycastTaskFilterStorage) => storage.setItem(SEARCH_FILTERS_STORAGE_KEY, '{"status":"open"}'),
    ],
    ["removeItem", (storage: RaycastTaskFilterStorage) => storage.removeItem(LEGACY_SEARCH_PROJECT_FILTER_KEY)],
  ] as const)("propagates the underlying %s rejection unchanged", async (method, invoke) => {
    const failure = new Error(`PRIVATE-MARKER-${method}-rejection`);
    localStorageMock[method].mockRejectedValue(failure);

    await expect(invoke(adapter())).rejects.toBe(failure);
    expect(localStorageMock[method]).toHaveBeenCalledTimes(1);
  });

  it("exports a singleton wired to the installed Raycast LocalStorage object", async () => {
    localStorageMock.getItem.mockResolvedValue("singleton-value");

    await expect(raycastTaskFilterStorage.getItem(SEARCH_FILTERS_STORAGE_KEY)).resolves.toBe("singleton-value");
    expect(localStorageMock.getItem).toHaveBeenCalledWith(SEARCH_FILTERS_STORAGE_KEY);
  });

  it("keeps the adapter boundary free of data inspection, persistence semantics, retries, logging, and Keychain", () => {
    const source = readFileSync(resolve(__dirname, "RaycastTaskFilterStorage.ts"), "utf8");
    const imports = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]).sort();

    expect(imports).toEqual(["../domain/errors", "./taskFilterPreferences", "@raycast/api"]);
    expect(source).not.toMatch(/Keychain|console\.|JSON\.|setTimeout|retry|account|taskContent|searchText|projectName/);
    expect(source).not.toMatch(/allItems|clear\s*\(/);
  });
});
