import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => store.get(key),
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  },
}));

import { getApps, addApp, updateApp, removeApp, getActiveAppId, getActiveApp } from "./storage";
import type { ClerkApp } from "../types";

const appA: ClerkApp = { id: "a", name: "A", instanceType: "production", secretKey: "sk_live_a" };
const appB: ClerkApp = { id: "b", name: "B", instanceType: "development", secretKey: "sk_test_b" };

beforeEach(() => store.clear());

describe("storage", () => {
  it("starts empty", async () => {
    expect(await getApps()).toEqual([]);
    expect(await getActiveAppId()).toBeUndefined();
  });

  it("makes the first added app active, but not later ones", async () => {
    await addApp(appA);
    expect(await getActiveAppId()).toBe("a");
    await addApp(appB);
    expect(await getActiveAppId()).toBe("a");
    expect((await getApps()).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("updates an app in place", async () => {
    await addApp(appA);
    await updateApp({ ...appA, name: "Renamed" });
    expect((await getActiveApp())?.name).toBe("Renamed");
  });

  it("reassigns active when the active app is removed", async () => {
    await addApp(appA);
    await addApp(appB);
    await removeApp("a");
    expect(await getActiveAppId()).toBe("b");
    await removeApp("b");
    expect(await getActiveAppId()).toBeUndefined();
    expect(await getApps()).toEqual([]);
  });
});
