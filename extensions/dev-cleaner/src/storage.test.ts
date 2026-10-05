import { beforeEach, describe, expect, it, vi } from "vitest";

const { values } = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => values.get(key)),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  },
}));

import {
  normalizeProjectRoots,
  readCleanupHistory,
  readExcludedItems,
  readProjectRoots,
  recordCleanupRun,
  writeExcludedItems,
  writeProjectRoots,
} from "./storage";
import type { CleanupCandidate, ExcludedItem } from "./types";

beforeEach(() => values.clear());

describe("local storage", () => {
  it("stores unique project roots and handles invalid data", async () => {
    await writeProjectRoots(["/one", "/one", "/two"]);
    await expect(readProjectRoots()).resolves.toEqual(["/one", "/two"]);
    values.set("project-roots", "not-json");
    await expect(readProjectRoots()).resolves.toBeUndefined();
  });

  it("treats missing saved data as unset", async () => {
    await expect(readProjectRoots()).resolves.toBeUndefined();
    await expect(readExcludedItems()).resolves.toEqual([]);
  });

  it("removes nested project roots", async () => {
    await expect(normalizeProjectRoots(["/projects/app", "/projects", "/projects/app"])).resolves.toEqual([
      "/projects",
    ]);
  });

  it("persists exact kept items and refuses malformed records", async () => {
    const item: ExcludedItem = {
      id: "projects:/work/app/node_modules",
      title: "node_modules",
      subtitle: "/work/app/node_modules",
      providerId: "projects",
      path: "/work/app/node_modules",
      addedAt: "2026-09-25T00:00:00.000Z",
    };
    await writeExcludedItems([item]);
    await expect(readExcludedItems()).resolves.toEqual([item]);
    values.set("excluded-items", JSON.stringify([item, item]));
    await expect(readExcludedItems()).resolves.toEqual([item]);
    values.set("excluded-items", JSON.stringify([item, null]));
    await expect(readExcludedItems()).rejects.toThrow("Saved kept items are invalid");
    values.set("excluded-items", JSON.stringify([item, { id: 42 }]));
    await expect(readExcludedItems()).rejects.toThrow("Saved kept items are invalid");
    values.set("excluded-items", "invalid");
    await expect(readExcludedItems()).rejects.toThrow("Saved kept items are invalid");
    values.set("excluded-items", "");
    await expect(readExcludedItems()).rejects.toThrow("Saved kept items are invalid");
  });

  it("records structured cleanup history", async () => {
    const candidate: CleanupCandidate = {
      id: "item",
      providerId: "pnpm",
      section: "Packages",
      title: "Prune pnpm",
      subtitle: "pnpm store prune",
      description: "test",
      cleanupPolicy: "command",
      risk: "safe",
      selectedByDefault: false,
    };
    const run = await recordCleanupRun(
      [candidate],
      [{ candidateId: "item", status: "cleaned", message: "done" }],
      new Date("2026-09-24T01:00:00Z"),
      new Date("2026-09-24T01:00:01Z"),
    );
    expect(run.items[0]).toMatchObject({ title: "Prune pnpm", providerId: "pnpm", cleanupPolicy: "command" });
    await expect(readCleanupHistory()).resolves.toEqual([run]);
    values.set("cleanup-history", "invalid");
    await expect(readCleanupHistory()).resolves.toEqual([]);
  });
});
