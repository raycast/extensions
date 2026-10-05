import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  store: new Map<string, string>(),
  mutate: vi.fn(),
  createApi: vi.fn(),
  launchCommand: vi.fn(),
  supportPath: "",
  prefs: { apiToken: "test-token", baseUrl: "https://tracktimer.app" },
}));
vi.mock("@raycast/api", () => ({
  environment: {
    get supportPath() {
      return mocks.supportPath;
    },
  },
  getPreferenceValues: () => mocks.prefs,
  launchCommand: mocks.launchCommand,
  LaunchType: { Background: "background" },
  Cache: class {
    get() {
      return undefined;
    }
    set() {}
    remove() {
      return false;
    }
    clear() {}
  },
  LocalStorage: {
    allItems: async () => Object.fromEntries(mocks.store),
    getItem: async (key: string) => mocks.store.get(key),
    setItem: async (key: string, value: string) => {
      mocks.store.set(key, value);
    },
    removeItem: async (key: string) => {
      mocks.store.delete(key);
    },
  },
}));
vi.mock("./api", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api")>();
  return {
    ...original,
    TrackTimerApi: class {
      constructor(options: { baseUrl: string; token: string }) {
        mocks.createApi(options);
      }
      mutate = mocks.mutate;
    },
  };
});

import { session } from "./session";

mocks.supportPath = mkdtempSync(join(tmpdir(), "tracktimer-worker-test-"));
afterAll(() => rmSync(mocks.supportPath, { recursive: true, force: true }));
beforeEach(() => {
  mocks.store.clear();
  mocks.mutate.mockReset();
  mocks.createApi.mockReset();
  mocks.launchCommand.mockReset();
  mocks.launchCommand.mockImplementation(async ({ name, context }) => {
    if (name === "process-timer")
      await session()
        .processPending(context.operationId, context.connectionId)
        .catch(() => {});
  });
  mocks.prefs = { apiToken: "test-token", baseUrl: "https://tracktimer.app" };
});
it("persists a mutation before sending and retries the same operation after reopening", async () => {
  mocks.mutate
    .mockImplementationOnce(async () => {
      expect(mocks.store.size).toBe(1);
      throw new Error("Connection lost");
    })
    .mockResolvedValueOnce({});
  await expect(
    session().execute("/timers/start", { projectId: "project", billable: true }),
  ).rejects.toThrow();
  const first = mocks.mutate.mock.calls[0][0];
  await session().execute();
  expect(mocks.mutate.mock.calls[1][0]).toEqual(first);
  expect(await session().pending()).toBeNull();
  expect(JSON.stringify(first)).not.toContain("test-token");
});

it("ignores legacy server preferences and keeps pending operations across token formatting", async () => {
  mocks.mutate.mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce({});
  await expect(
    session().execute("/timers/start", { projectId: "project", billable: true }),
  ).rejects.toThrow();
  mocks.prefs = { apiToken: " test-token ", baseUrl: "http://localhost:3001" };
  expect(session().baseUrl).toBe("https://www.tracktimer.app");
  expect(mocks.createApi).toHaveBeenLastCalledWith({
    baseUrl: "https://www.tracktimer.app",
    token: " test-token ",
  });
  expect(await session().pending()).not.toBeNull();
  await session().execute();
  expect(mocks.mutate.mock.calls[1][0]).toEqual(mocks.mutate.mock.calls[0][0]);
});

it("refreshes an enabled menu bar after a successful action", async () => {
  mocks.store.set("menu-bar-enabled", "true");
  mocks.mutate.mockResolvedValue({});
  await session().execute("/timers/start", { projectId: "project", billable: true });
  expect(mocks.launchCommand).toHaveBeenCalledWith({ name: "menu-bar", type: "background" });
});
it("does not report timer failure if the menu bar was disabled", async () => {
  mocks.store.set("menu-bar-enabled", "true");
  mocks.mutate.mockResolvedValue({});
  mocks.launchCommand.mockImplementation(async ({ name, context }) => {
    if (name === "menu-bar") throw new Error("Disabled");
    await session()
      .processPending(context.operationId, context.connectionId)
      .catch(() => {});
  });
  await expect(
    session().execute("/timers/start", { projectId: "project", billable: true }),
  ).resolves.toEqual({});
  expect(await session().pending()).toBeNull();
});
it("does not enable the menu bar when it has never been opened", async () => {
  mocks.mutate.mockResolvedValue({});
  await session().execute("/timers/start", { projectId: "project", billable: true });
  expect(mocks.launchCommand).not.toHaveBeenCalledWith(
    expect.objectContaining({ name: "menu-bar" }),
  );
});

it("hands a saved operation to an independent session before waiting for confirmation", async () => {
  let context: { operationId: string; connectionId: string } | undefined;
  mocks.launchCommand.mockImplementation(async (args) => {
    context = args.context;
  });
  const result = { timer: null, stoppedTimerId: null };
  mocks.mutate.mockResolvedValue(result);
  const waiting = session().execute("/timers/start", { projectId: "project", billable: true });
  await vi.waitFor(() => expect(context).toBeDefined());
  expect(mocks.mutate).not.toHaveBeenCalled();
  expect((await session().pending())?.id).toBe(context!.operationId);
  await session().processPending(context!.operationId, context!.connectionId);
  await expect(waiting).resolves.toEqual(result);
  expect(await session().pending()).toBeNull();
});

it("retains the action when background launch fails", async () => {
  mocks.launchCommand.mockRejectedValue(new Error("Disabled"));
  await expect(session().execute("/timers/start")).rejects.toMatchObject({ uncertain: true });
  expect(await session().pending()).not.toBeNull();
  expect(mocks.mutate).not.toHaveBeenCalled();
});

it("does not send a saved action from a different connection", async () => {
  mocks.launchCommand.mockRejectedValue(new Error("Disabled"));
  await expect(session().execute("/timers/start")).rejects.toThrow();
  await session().processPending((await session().pending())!.id, "different-connection");
  expect(mocks.mutate).not.toHaveBeenCalled();
});

it("lets a new choice replace a failed pending action without replaying it", async () => {
  mocks.launchCommand.mockRejectedValue(new Error("Disabled"));
  await expect(
    session().execute("/timers/start", { projectId: "old", billable: true }),
  ).rejects.toThrow();
  const old = (await session().pending())!;
  await expect(
    session().execute("/timers/start", { projectId: "new", billable: true }),
  ).rejects.toThrow();
  const replacement = (await session().pending())!;
  expect(replacement.id).not.toBe(old.id);
  expect(replacement.body?.projectId).toBe("new");
  await session().processPending(old.id, session().connectionId);
  expect(mocks.mutate).not.toHaveBeenCalled();
  mocks.mutate.mockResolvedValue({ timer: null, stoppedTimerId: null });
  await session().processPending(replacement.id, session().connectionId);
  expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith(replacement);
});

it("holds new choices until the active worker finishes sending", async () => {
  mocks.launchCommand.mockRejectedValue(new Error("Disabled"));
  await expect(session().execute("/timers/start")).rejects.toThrow();
  let finish!: (result: { timer: null; stoppedTimerId: null }) => void;
  mocks.mutate.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const worker = session().processPending();
  await vi.waitFor(() => expect(finish).toBeDefined());
  const old = await session().pending();
  const next = session()
    .execute("/timers/start", { projectId: "new", billable: true })
    .catch(() => {});
  expect(await session().pending()).toEqual(old);
  finish({ timer: null, stoppedTimerId: null });
  await worker;
  await next;
  expect((await session().pending())?.body?.projectId).toBe("new");
});
