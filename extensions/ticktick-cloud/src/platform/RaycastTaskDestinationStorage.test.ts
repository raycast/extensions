import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { LocalStorage } from "@raycast/api";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { ValidationError } from "../domain/errors";
import type { TaskDestinationScope } from "../application/taskDestination";
import {
  createRaycastTaskDestinationStorage,
  RaycastTaskDestinationStorage,
  raycastTaskDestinationStorage,
  type RaycastTaskDestinationLocalStoragePort,
} from "./RaycastTaskDestinationStorage";
import {
  LEGACY_DEFAULT_DESTINATION_KEY,
  taskDestinationStorageKey,
  type TaskDestinationStoragePort,
} from "./taskDestinationPreferences";

const localStorageMock = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@raycast/api", () => ({ LocalStorage: localStorageMock }));

const scope: TaskDestinationScope = Object.freeze({ backendId: "mcp", accountKey: "oauth:account" });
const scopedKey = taskDestinationStorageKey(scope);
const SAFE_VALIDATION_MESSAGE = "Unsupported task-destination storage operation.";

function adapter(): RaycastTaskDestinationStorage {
  return createRaycastTaskDestinationStorage(localStorageMock as unknown as RaycastTaskDestinationLocalStoragePort);
}

beforeEach(() => {
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
});

describe("RaycastTaskDestinationStorage", () => {
  it("matches the preference port and installed Raycast signatures", () => {
    expectTypeOf<RaycastTaskDestinationStorage>().toMatchTypeOf<TaskDestinationStoragePort>();
    expectTypeOf<RaycastTaskDestinationLocalStoragePort>().toEqualTypeOf<
      Pick<typeof LocalStorage, "getItem" | "setItem" | "removeItem">
    >();
    expectTypeOf(raycastTaskDestinationStorage).toMatchTypeOf<TaskDestinationStoragePort>();
  });

  it.each([scopedKey, LEGACY_DEFAULT_DESTINATION_KEY])("reads an allowed key exactly once: %s", async (key) => {
    localStorageMock.getItem.mockResolvedValue("stored-project");

    await expect(adapter().getItem(key)).resolves.toBe("stored-project");
    expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);
    expect(localStorageMock.getItem).toHaveBeenCalledWith(key);
  });

  it.each([undefined, "project", 0, false, { private: "PRIVATE object" }])(
    "returns only strings or undefined for %#",
    async (stored) => {
      localStorageMock.getItem.mockResolvedValue(stored);

      await expect(adapter().getItem(scopedKey)).resolves.toBe(typeof stored === "string" ? stored : undefined);
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(1);
    }
  );

  it("writes an allowed scoped key and value exactly once", async () => {
    localStorageMock.setItem.mockResolvedValue(undefined);

    await expect(adapter().setItem(scopedKey, "project-id")).resolves.toBeUndefined();
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(scopedKey, "project-id");
  });

  it.each([scopedKey, LEGACY_DEFAULT_DESTINATION_KEY])("removes an allowed key exactly once: %s", async (key) => {
    localStorageMock.removeItem.mockResolvedValue(undefined);

    await expect(adapter().removeItem(key)).resolves.toBeUndefined();
    expect(localStorageMock.removeItem).toHaveBeenCalledTimes(1);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(key);
  });

  it.each([
    "private-key",
    "ticktick.defaultDestination.v1.mcp.short",
    `ticktick.defaultDestination.v1.invalid.${"a".repeat(64)}`,
    `ticktick.defaultDestination.v1.mcp.${"A".repeat(64)}`,
    `ticktick.defaultDestination.v1.mcp.${"a".repeat(63)}g`,
    `${scopedKey}.extra`,
  ])("rejects unsupported read/write/remove key %s without forwarding", async (key) => {
    for (const invoke of [
      () => adapter().getItem(key),
      () => adapter().setItem(key, "project"),
      () => adapter().removeItem(key),
    ]) {
      await expect(invoke()).rejects.toMatchObject({
        name: "ValidationError",
        message: SAFE_VALIDATION_MESSAGE,
      });
    }
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it("allows legacy reads/removes but never legacy writes", async () => {
    await expect(adapter().setItem(LEGACY_DEFAULT_DESTINATION_KEY, "legacy-project")).rejects.toMatchObject({
      name: "ValidationError",
      message: SAFE_VALIDATION_MESSAGE,
    });
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("does not coerce hostile runtime-cast keys or values", async () => {
    let keyReads = 0;
    let valueReads = 0;
    const hostileKey = Object.defineProperty({}, "toString", {
      get() {
        keyReads += 1;
        throw new Error("PRIVATE key");
      },
    }) as unknown as string;
    const hostileValue = Object.defineProperty({}, "toString", {
      get() {
        valueReads += 1;
        throw new Error("PRIVATE value");
      },
    }) as unknown as string;

    await expect(adapter().setItem(hostileKey, hostileValue)).rejects.toBeInstanceOf(ValidationError);
    expect(keyReads).toBe(0);
    expect(valueReads).toBe(0);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 0, false, { private: "PRIVATE object" }])(
    "rejects a runtime-cast non-string value for a valid scoped key without forwarding: %#",
    async (value) => {
      await expect(adapter().setItem(scopedKey, value as unknown as string)).rejects.toMatchObject({
        name: "ValidationError",
        message: SAFE_VALIDATION_MESSAGE,
      });
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    }
  );

  it("does not observe a hostile runtime-cast value when the scoped key is valid", async () => {
    let reads = 0;
    const hostileValue = new Proxy(
      {},
      {
        getPrototypeOf() {
          reads += 1;
          throw new Error("PRIVATE hostile value");
        },
        get() {
          reads += 1;
          throw new Error("PRIVATE hostile value");
        },
      }
    ) as unknown as string;

    await expect(adapter().setItem(scopedKey, hostileValue)).rejects.toMatchObject({
      name: "ValidationError",
      message: SAFE_VALIDATION_MESSAGE,
    });
    expect(reads).toBe(0);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it.each([
    ["getItem", (instance: RaycastTaskDestinationStorage) => instance.getItem(scopedKey)],
    ["setItem", (instance: RaycastTaskDestinationStorage) => instance.setItem(scopedKey, "project")],
    ["removeItem", (instance: RaycastTaskDestinationStorage) => instance.removeItem(scopedKey)],
  ] as const)("propagates an underlying %s rejection unchanged and never retries", async (method, invoke) => {
    const failure = new Error(`PRIVATE ${method}`);
    localStorageMock[method].mockRejectedValue(failure);

    await expect(invoke(adapter())).rejects.toBe(failure);
    expect(localStorageMock[method]).toHaveBeenCalledTimes(1);
  });

  it("exports a singleton wired to Raycast LocalStorage", async () => {
    localStorageMock.getItem.mockResolvedValue("singleton-project");

    await expect(raycastTaskDestinationStorage.getItem(scopedKey)).resolves.toBe("singleton-project");
    expect(localStorageMock.getItem).toHaveBeenCalledWith(scopedKey);
  });

  it("keeps the adapter free of semantics, retries, logging, Keychain, and broad LocalStorage access", () => {
    const source = readFileSync(resolve(__dirname, "RaycastTaskDestinationStorage.ts"), "utf8");
    const imports = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]).sort();

    expect(imports).toEqual(["../domain/errors", "./taskDestinationPreferences", "@raycast/api"]);
    expect(source).not.toMatch(/Keychain|console\.|JSON\.|setTimeout|retry|allItems|clear\s*\(/);
  });
});
