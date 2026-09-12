import { mkdtemp, readdir, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupStaleBenchmarkFiles } from "../src/benchmark/destination";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("cleanupStaleBenchmarkFiles", () => {
  it("deletes only old regular files matching the benchmark UUID contract", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "disk-speed-cleanup-"));
    temporaryDirectories.push(directory);
    const oldFile = ".raycast-disk-speed-v1-8B4A110D-2F89-4A63-8146-4651A8A2F304.tmp";
    const recentFile = ".raycast-disk-speed-v1-1F8DFA02-90C4-4128-9A94-C048C2D6AB6E.tmp";
    const unrelatedFile = "important.tmp";
    const symlinkFile = ".raycast-disk-speed-v1-84161EDC-1C21-4F1E-855F-746012E0A691.tmp";
    await writeFile(path.join(directory, oldFile), "old benchmark data");
    await writeFile(path.join(directory, recentFile), "active benchmark data");
    await writeFile(path.join(directory, unrelatedFile), "user data");
    await symlink(path.join(directory, unrelatedFile), path.join(directory, symlinkFile));
    await utimes(
      path.join(directory, oldFile),
      new Date("2026-08-25T10:00:00.000Z"),
      new Date("2026-08-25T10:00:00.000Z"),
    );

    const removed = await cleanupStaleBenchmarkFiles(directory, new Date("2026-08-25T12:00:00.000Z"));

    expect(removed).toEqual([oldFile]);
    expect((await readdir(directory)).sort()).toEqual([recentFile, symlinkFile, unrelatedFile].sort());
  });
});
