import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { mkdtemp, writeFile, rm, mkdir, link, symlink } from "fs/promises";
import { join } from "path";
import { isSameEntry, isSameFile, normalizePath } from "../lib/paths";

/**
 * Whether the volume backing `dir` collapses names that differ only in case.
 * macOS is case-insensitive by default but APFS can be formatted case-sensitive,
 * so the expected result of a case-only comparison is a property of wherever the
 * test happens to be running.
 */
async function isCaseInsensitiveVolume(dir: string): Promise<boolean> {
  const probe = join(dir, ".case-probe-Aa");
  await writeFile(probe, "");
  try {
    const { access } = await import("fs/promises");
    await access(join(dir, ".case-probe-aA"));
    return true;
  } catch {
    return false;
  } finally {
    await rm(probe, { force: true });
  }
}

describe("isSameFile", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "renaming-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should return true for the identical path", async () => {
    const filePath = join(testDir, "file.txt");
    await writeFile(filePath, "content");

    expect(await isSameFile(filePath, filePath)).toBe(true);
  });

  it("should return false for two distinct files", async () => {
    const file1 = join(testDir, "file1.txt");
    const file2 = join(testDir, "file2.txt");
    await writeFile(file1, "content1");
    await writeFile(file2, "content2");

    expect(await isSameFile(file1, file2)).toBe(false);
  });

  it("should return true for two hard links to one inode", async () => {
    const original = join(testDir, "original.txt");
    const hardLink = join(testDir, "hardlink.txt");
    await writeFile(original, "content");
    await link(original, hardLink);

    expect(await isSameFile(original, hardLink)).toBe(true);
  });

  it("should return false for a symlink and its target", async () => {
    // rename operates on the directory entry, so a symlink is a different file
    // from what it points at even though stat() would follow through to it
    const target = join(testDir, "target.txt");
    const linkPath = join(testDir, "link.txt");
    await writeFile(target, "content");
    await symlink(target, linkPath);

    expect(await isSameFile(linkPath, target)).toBe(false);
  });

  it("should return false when a path does not exist", async () => {
    const filePath = join(testDir, "file.txt");
    await writeFile(filePath, "content");

    expect(await isSameFile(filePath, join(testDir, "missing.txt"))).toBe(false);
    expect(await isSameFile(join(testDir, "missing.txt"), filePath)).toBe(false);
  });

  it("should return true for directories that are the same directory", async () => {
    const dirPath = join(testDir, "subdir");
    await mkdir(dirPath);

    expect(await isSameFile(dirPath, join(testDir, "subdir"))).toBe(true);
  });

  it("should answer case-only comparisons according to the volume, not the platform", async () => {
    const upper = join(testDir, "CASE.txt");
    const lower = join(testDir, "case.txt");
    await writeFile(upper, "content");

    const caseInsensitive = await isCaseInsensitiveVolume(testDir);
    if (!caseInsensitive) {
      await writeFile(lower, "other content");
    }

    // Case-insensitive: both names reach one inode, so a case-only rename is a no-op.
    // Case-sensitive: they are two files, and a case-only rename would overwrite one.
    expect(await isSameFile(upper, lower)).toBe(caseInsensitive);
  });
});

describe("isSameEntry", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "renaming-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should return true for the identical path", async () => {
    const filePath = join(testDir, "file.txt");
    await writeFile(filePath, "content");

    expect(await isSameEntry(filePath, filePath)).toBe(true);
  });

  it("should return false for two hard links to one inode", async () => {
    // One file, but two directory entries — narrower than isSameFile on purpose
    const original = join(testDir, "original.txt");
    const hardLink = join(testDir, "hardlink.txt");
    await writeFile(original, "content");
    await link(original, hardLink);

    expect(await isSameFile(original, hardLink)).toBe(true);
    expect(await isSameEntry(original, hardLink)).toBe(false);
  });

  it("should return false for two unrelated files", async () => {
    const file1 = join(testDir, "file1.txt");
    const file2 = join(testDir, "file2.txt");
    await writeFile(file1, "content1");
    await writeFile(file2, "content2");

    expect(await isSameEntry(file1, file2)).toBe(false);
  });

  it("should answer case-only renames according to the volume", async () => {
    const upper = join(testDir, "CASE.txt");
    const lower = join(testDir, "case.txt");
    await writeFile(upper, "content");

    const caseInsensitive = await isCaseInsensitiveVolume(testDir);
    if (!caseInsensitive) {
      await writeFile(lower, "other content");
    }

    // The one case the overwrite guard is allowed to skip — and only where the
    // volume really does treat both spellings as a single entry
    expect(await isSameEntry(upper, lower)).toBe(caseInsensitive);
  });
});

describe("normalizePath", () => {
  it("should collapse case on case-insensitive platforms", () => {
    const expected = process.platform === "darwin" || process.platform === "win32" ? "/tmp/foo.txt" : "/tmp/FOO.txt";

    expect(normalizePath("/tmp/FOO.txt")).toBe(expected);
  });

  it("should be stable for already-normalized paths", () => {
    expect(normalizePath("/tmp/foo.txt")).toBe("/tmp/foo.txt");
  });
});
