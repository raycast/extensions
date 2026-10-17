import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { assertSafeTrashPath, isPathInside, PROJECT_ARTIFACT_NAMES } from "./path-safety";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("path safety", () => {
  it("uses path boundaries instead of string prefixes", () => {
    expect(isPathInside("/tmp/root/child", "/tmp/root")).toBe(true);
    expect(isPathInside("/tmp/root", "/tmp/root")).toBe(false);
    expect(isPathInside("/tmp/root-other/child", "/tmp/root")).toBe(false);
  });

  it("accepts allowlisted artifacts below a configured root", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-safety-"));
    temporaryDirectories.push(home);
    const root = path.join(home, "projects");
    const artifact = path.join(root, "app/node_modules");
    await mkdir(artifact, { recursive: true });
    await expect(
      assertSafeTrashPath(artifact, {
        homeDirectory: home,
        allowedRoots: [path.join(home, "missing-root"), root],
        expectedNames: PROJECT_ARTIFACT_NAMES,
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects home, outside paths, unexpected names, and escaping symlinks", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-safety-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "dev-cleaner-outside-"));
    temporaryDirectories.push(home, outside);
    const root = path.join(home, "projects");
    await mkdir(path.join(root, "app/src"), { recursive: true });
    await symlink(outside, path.join(root, "external-link"));

    await expect(assertSafeTrashPath(home, { homeDirectory: home, allowedRoots: [root] })).rejects.toThrow(
      "root or home",
    );
    await expect(assertSafeTrashPath(outside, { homeDirectory: home, allowedRoots: [root] })).rejects.toThrow(
      "outside",
    );
    await expect(
      assertSafeTrashPath(path.join(root, "app/src"), {
        homeDirectory: home,
        allowedRoots: [root],
        expectedNames: PROJECT_ARTIFACT_NAMES,
      }),
    ).rejects.toThrow("not allowlisted");
    await expect(
      assertSafeTrashPath(path.join(root, "external-link"), { homeDirectory: home, allowedRoots: [root] }),
    ).resolves.toBeUndefined();
  });
});
