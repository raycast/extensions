import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { ValidationError } from "../domain/errors";
import type { TaskDestinationPreferencePort, TaskDestinationScope } from "../application/taskDestination";
import {
  LEGACY_DEFAULT_DESTINATION_KEY,
  TaskDestinationPreferenceStore,
  taskDestinationStorageKey,
  type TaskDestinationStoragePort,
} from "./taskDestinationPreferences";

const mcpScope: TaskDestinationScope = Object.freeze({ backendId: "mcp", accountKey: "oauth:PRIVATE-ACCOUNT-A" });
const openApiScope: TaskDestinationScope = Object.freeze({
  backendId: "openapi",
  accountKey: "api-token:PRIVATE-ACCOUNT-B",
});

function deferred<Value>() {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function storage(initial: Readonly<Record<string, string>> = {}) {
  const values = new Map(Object.entries(initial));
  const port: TaskDestinationStoragePort = {
    getItem: vi.fn(async (key: string) => values.get(key)),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  };
  return { port, values };
}

describe("task destination preference keys", () => {
  it("uses the backend plus a lowercase SHA-256 account hash without exposing the account key", () => {
    const key = taskDestinationStorageKey(mcpScope);

    expect(key).toMatch(/^ticktick\.defaultDestination\.v1\.mcp\.[0-9a-f]{64}$/);
    expect(key).not.toContain(mcpScope.accountKey);
    expect(key).not.toContain("PRIVATE");
    expect(taskDestinationStorageKey(mcpScope)).toBe(key);
  });

  it("isolates different accounts and backends", () => {
    const sameAccountOtherBackend: TaskDestinationScope = { ...mcpScope, backendId: "openapi" };
    const sameBackendOtherAccount: TaskDestinationScope = { ...mcpScope, accountKey: "oauth:another-account" };

    expect(
      new Set([mcpScope, sameAccountOtherBackend, sameBackendOtherAccount].map(taskDestinationStorageKey)).size
    ).toBe(3);
  });

  it.each([
    ["blank account", { backendId: "mcp", accountKey: "  " }],
    ["control-bearing account", { backendId: "mcp", accountKey: "oauth:\u0000account" }],
    ["format-bearing account", { backendId: "mcp", accountKey: "oauth:\u200Baccount" }],
    ["unpaired high-surrogate account", { backendId: "mcp", accountKey: "oauth:\uD800" }],
    ["unpaired low-surrogate account", { backendId: "mcp", accountKey: "oauth:\uDC00" }],
    ["invalid backend", { backendId: "private-backend", accountKey: "account" }],
    ["missing scope", undefined],
  ])("rejects an invalid %s with fixed copy", (_name, value) => {
    expect(() => taskDestinationStorageKey(value as TaskDestinationScope)).toThrowError(
      new ValidationError("Invalid task destination preference.")
    );
  });

  it("rejects malformed UTF-16 account keys instead of hashing distinct values to one replacement sequence", () => {
    const high: TaskDestinationScope = { backendId: "mcp", accountKey: "oauth:\uD800" };
    const low: TaskDestinationScope = { backendId: "mcp", accountKey: "oauth:\uDC00" };

    expect(() => taskDestinationStorageKey(high)).toThrowError(ValidationError);
    expect(() => taskDestinationStorageKey(low)).toThrowError(ValidationError);
  });
});

describe("TaskDestinationPreferenceStore", () => {
  it("implements the application preference port", () => {
    expectTypeOf<TaskDestinationPreferenceStore>().toMatchTypeOf<TaskDestinationPreferencePort>();
  });

  it("loads one valid scoped opaque project id", async () => {
    const key = taskDestinationStorageKey(mcpScope);
    const state = storage({ [key]: "project-work" });
    const store = new TaskDestinationPreferenceStore(state.port);

    await expect(store.load(mcpScope)).resolves.toBe("project-work");
    expect(state.port.getItem).toHaveBeenCalledTimes(1);
    expect(state.port.getItem).toHaveBeenCalledWith(key);
    expect(state.port.setItem).not.toHaveBeenCalled();
    expect(state.port.removeItem).not.toHaveBeenCalled();
  });

  it.each([
    ["empty", ""],
    ["blank", "  \n"],
    ["leading whitespace", " project"],
    ["control", "project\u0000id"],
    ["format", "project\u200Bid"],
    ["unpaired high surrogate", "project\uD800"],
    ["unpaired low surrogate", "project\uDC00"],
  ])("fails closed for a stored %s id", async (_name, value) => {
    const key = taskDestinationStorageKey(mcpScope);
    const state = storage({ [key]: value });

    await expect(new TaskDestinationPreferenceStore(state.port).load(mcpScope)).resolves.toBeUndefined();
    expect(state.port.getItem).toHaveBeenCalledTimes(1);
    expect(state.port.getItem).not.toHaveBeenCalledWith(LEGACY_DEFAULT_DESTINATION_KEY);
  });

  it("migrates the valid legacy project only after writing the scoped value", async () => {
    const state = storage({ [LEGACY_DEFAULT_DESTINATION_KEY]: "legacy-project" });
    const store = new TaskDestinationPreferenceStore(state.port);
    const events: string[] = [];
    vi.mocked(state.port.setItem).mockImplementation(async (key, value) => {
      events.push(`set:${key}:${value}`);
      state.values.set(key, value);
    });
    vi.mocked(state.port.removeItem).mockImplementation(async (key) => {
      events.push(`remove:${key}`);
      state.values.delete(key);
    });

    await expect(store.load(mcpScope)).resolves.toBe("legacy-project");

    const scopedKey = taskDestinationStorageKey(mcpScope);
    expect(events).toEqual([`set:${scopedKey}:legacy-project`, `remove:${LEGACY_DEFAULT_DESTINATION_KEY}`]);
    expect(state.values.get(scopedKey)).toBe("legacy-project");
    expect(state.values.has(LEGACY_DEFAULT_DESTINATION_KEY)).toBe(false);
  });

  it("retains and returns a valid legacy value when its scoped migration write fails", async () => {
    const state = storage({ [LEGACY_DEFAULT_DESTINATION_KEY]: "legacy-project" });
    const failure = new Error("PRIVATE migration failure");
    vi.mocked(state.port.setItem).mockRejectedValue(failure);

    await expect(new TaskDestinationPreferenceStore(state.port).load(mcpScope)).resolves.toBe("legacy-project");
    expect(state.port.setItem).toHaveBeenCalledTimes(1);
    expect(state.port.removeItem).not.toHaveBeenCalled();
    expect(state.values.get(LEGACY_DEFAULT_DESTINATION_KEY)).toBe("legacy-project");
  });

  it("treats storage read failures as no preference", async () => {
    const state = storage();
    vi.mocked(state.port.getItem).mockRejectedValue(new Error("PRIVATE read failure"));

    await expect(new TaskDestinationPreferenceStore(state.port).load(mcpScope)).resolves.toBeUndefined();
    expect(state.port.getItem).toHaveBeenCalledTimes(1);
    expect(state.port.setItem).not.toHaveBeenCalled();
  });

  it("orders concurrent remembers so the last selection wins even when the first write is slow", async () => {
    const state = storage();
    const firstWrite = deferred<void>();
    vi.mocked(state.port.setItem)
      .mockImplementationOnce(async () => firstWrite.promise)
      .mockImplementationOnce(async (key, value) => {
        state.values.set(key, value);
      });
    const store = new TaskDestinationPreferenceStore(state.port);

    const first = store.remember(mcpScope, "project-first");
    const second = store.remember(mcpScope, "project-second");
    await Promise.resolve();
    expect(state.port.setItem).toHaveBeenCalledTimes(1);

    firstWrite.resolve();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);

    const key = taskDestinationStorageKey(mcpScope);
    expect(state.port.setItem).toHaveBeenNthCalledWith(1, key, "project-first");
    expect(state.port.setItem).toHaveBeenNthCalledWith(2, key, "project-second");
    expect(state.values.get(key)).toBe("project-second");
  });

  it("does not let a slow load overwrite a newer remembered selection", async () => {
    const key = taskDestinationStorageKey(mcpScope);
    const slowRead = deferred<string | undefined>();
    const state = storage();
    vi.mocked(state.port.getItem).mockImplementationOnce(async () => slowRead.promise);
    const store = new TaskDestinationPreferenceStore(state.port);

    const loading = store.load(mcpScope);
    await Promise.resolve();
    const remembering = store.remember(mcpScope, "project-new");
    slowRead.resolve("project-old");

    await expect(loading).resolves.toBe("project-new");
    await expect(remembering).resolves.toBeUndefined();
    expect(state.values.get(key)).toBe("project-new");
  });

  it("continues later queued writes after an earlier rejection", async () => {
    const state = storage();
    const failure = new Error("PRIVATE first write failure");
    vi.mocked(state.port.setItem)
      .mockRejectedValueOnce(failure)
      .mockImplementationOnce(async (key, value) => {
        state.values.set(key, value);
      });
    const store = new TaskDestinationPreferenceStore(state.port);

    const first = store.remember(mcpScope, "project-first");
    const second = store.remember(mcpScope, "project-second");

    await expect(first).rejects.toBe(failure);
    await expect(second).resolves.toBeUndefined();
    expect(state.values.get(taskDestinationStorageKey(mcpScope))).toBe("project-second");
  });

  it.each(["", "  ", " project", "project\u0000id", "project\u200Bid", "project\uD800"])(
    "rejects an invalid remembered id without storage side effects: %j",
    async (projectId) => {
      const state = storage();

      await expect(new TaskDestinationPreferenceStore(state.port).remember(mcpScope, projectId)).rejects.toMatchObject({
        name: "ValidationError",
        message: "Invalid task destination preference.",
      });
      expect(state.port.getItem).not.toHaveBeenCalled();
      expect(state.port.setItem).not.toHaveBeenCalled();
      expect(state.port.removeItem).not.toHaveBeenCalled();
    }
  );

  it("persists only the opaque project id and never serializes account, project name, or task content", async () => {
    const state = storage();
    const store = new TaskDestinationPreferenceStore(state.port);

    await store.remember(openApiScope, "opaque-project-id");

    expect(state.port.setItem).toHaveBeenCalledTimes(1);
    const [key, value] = vi.mocked(state.port.setItem).mock.calls[0];
    expect(key).not.toContain(openApiScope.accountKey);
    expect(value).toBe("opaque-project-id");
    expect(`${key}${value}`).not.toMatch(/PRIVATE|project name|task content/i);
  });
});
