import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { directorySize, isOlderThan, modifiedAt, pathExists } from "./fs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("filesystem helpers", () => {
  it("measures files and directories without following symlinks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-fs-"));
    temporaryDirectories.push(root);
    await mkdir(path.join(root, "nested"));
    await writeFile(path.join(root, "one"), "1234");
    await writeFile(path.join(root, "nested/two"), "12");
    await symlink(path.join(root, "nested"), path.join(root, "link"));

    expect(await directorySize(root)).toBe(6);
    expect(await directorySize(path.join(root, "one"))).toBe(4);
    expect(await directorySize(path.join(root, "link"))).toBe(0);
    expect(await pathExists(root)).toBe(true);
    expect(await pathExists(path.join(root, "missing"))).toBe(false);
    expect(await modifiedAt(root)).toBeInstanceOf(Date);
  });

  it("compares age thresholds", () => {
    const now = new Date("2026-09-24T00:00:00Z");
    expect(isOlderThan(new Date("2026-09-17T00:00:00Z"), 7, now)).toBe(true);
    expect(isOlderThan(new Date("2026-09-18T00:00:00Z"), 7, now)).toBe(false);
  });

  it("rethrows filesystem errors other than a missing path", async () => {
    await expect(pathExists("\0invalid-path")).rejects.toThrow();
  });

  it("honors an already-aborted size request", async () => {
    const controller = new AbortController();
    controller.abort(new Error("scan cancelled"));

    await expect(directorySize("/unused", controller.signal)).rejects.toThrow("scan cancelled");
  });
});
