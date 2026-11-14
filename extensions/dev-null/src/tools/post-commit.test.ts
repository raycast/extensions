import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmation } from "./post-commit";

const store = new Map<string, string>();
let afterSnapshot: (() => void) | undefined;

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => store.get(key),
    setItem: async (key: string, value: string) => void store.set(key, value),
    removeItem: async (key: string) => void store.delete(key),
    allItems: async () => {
      const snapshot = Object.fromEntries(store);
      afterSnapshot?.();
      return snapshot;
    },
  },
}));
vi.mock("@chrismessina/raycast-logger", () => ({ logger: { log: () => undefined } }));

const keyOf = (text: string) =>
  `approval:${createHash("sha256")
    .update(JSON.stringify({ message: text, imagePaths: [] }))
    .digest("hex")}`;

describe("confirmation", () => {
  beforeEach(() => {
    store.clear();
    afterSnapshot = undefined;
  });

  it("removes expired approvals", async () => {
    store.set(keyOf("old"), JSON.stringify({ at: 0, hashes: [] }));
    await confirmation({ text: "new" });
    expect(store.has(keyOf("old"))).toBe(false);
    expect(store.has(keyOf("new"))).toBe(true);
  });

  it("keeps an approval that another confirmation refreshed after the cleanup read the records", async () => {
    const fresh = JSON.stringify({ at: Date.now(), hashes: ["abc"] });
    store.set(keyOf("retried"), JSON.stringify({ at: 0, hashes: ["abc"] }));
    afterSnapshot = () => store.set(keyOf("retried"), fresh);
    await confirmation({ text: "other" });
    expect(store.get(keyOf("retried"))).toBe(fresh);
  });
});
