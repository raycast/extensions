import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLastWorkspace,
  getLastWorkspace,
  resolveLastWorkspace,
  saveLastWorkspace,
} from "@commands/open-daily-desk-note/lib/last-workspace";

afterEach(async () => {
  vi.restoreAllMocks();
  await clearLastWorkspace();
});

const workspaces = [
  { name: "Work", path: "/tmp/work" },
  { name: "Personal", path: "/tmp/personal" },
];

describe("last workspace", () => {
  it("stores, reads and clears the last workspace", async () => {
    await saveLastWorkspace("Work");

    expect(await getLastWorkspace()).toBe("Work");

    await clearLastWorkspace();

    expect(await getLastWorkspace()).toBeUndefined();
  });

  it("ignores blank stored values", async () => {
    await saveLastWorkspace("   ");

    expect(await getLastWorkspace()).toBeUndefined();
  });

  it("resolves the stored name against available workspaces", () => {
    expect(resolveLastWorkspace(workspaces, "work")).toEqual(workspaces[0]);
    expect(resolveLastWorkspace(workspaces, "PERSONAL")).toEqual(workspaces[1]);
  });

  it("returns undefined when there is no stored or matching workspace", () => {
    expect(resolveLastWorkspace(workspaces, undefined)).toBeUndefined();
    expect(resolveLastWorkspace(workspaces, "")).toBeUndefined();
    expect(resolveLastWorkspace(workspaces, "Missing")).toBeUndefined();
  });
});
