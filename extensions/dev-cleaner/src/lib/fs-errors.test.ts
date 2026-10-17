import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lstat: vi.fn(),
  opendir: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, lstat: mocks.lstat, opendir: mocks.opendir };
});

import { directorySize } from "./fs";

function directoryEntries(names: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const name of names) {
        yield {
          name,
          isDirectory: () => false,
          isSymbolicLink: () => false,
        };
      }
    },
  };
}

describe("filesystem race handling", () => {
  beforeEach(() => {
    mocks.lstat.mockReset();
    mocks.opendir.mockReset();
  });

  it.each(["ENOENT", "EACCES", "EPERM"])("ignores a child that fails with %s", async (code) => {
    const root = "/virtual-cache";
    mocks.lstat
      .mockResolvedValueOnce({ isSymbolicLink: () => false, isDirectory: () => true })
      .mockRejectedValueOnce(Object.assign(new Error(code), { code }));
    mocks.opendir.mockResolvedValue(directoryEntries(["stale-entry"]));

    await expect(directorySize(root)).resolves.toBe(0);
    expect(mocks.lstat).toHaveBeenLastCalledWith(path.join(root, "stale-entry"));
  });

  it("rethrows an unexpected child stat error", async () => {
    mocks.lstat
      .mockResolvedValueOnce({ isSymbolicLink: () => false, isDirectory: () => true })
      .mockRejectedValueOnce(Object.assign(new Error("disk failure"), { code: "EIO" }));
    mocks.opendir.mockResolvedValue(directoryEntries(["broken-entry"]));

    await expect(directorySize("/virtual-cache")).rejects.toThrow("disk failure");
  });
});
