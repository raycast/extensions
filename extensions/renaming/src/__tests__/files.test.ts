import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { mkdtemp, writeFile, rm, mkdir } from "fs/promises";
import { join } from "path";
import { getFileInfo, fileExists, renameFile } from "../lib/files";

describe("getFileInfo", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "renaming-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should return correct info for a file", async () => {
    const filePath = join(testDir, "test.txt");
    await writeFile(filePath, "content");

    const info = await getFileInfo(filePath);

    expect(info.path).toBe(filePath);
    expect(info.name).toBe("test.txt");
    expect(info.baseName).toBe("test");
    expect(info.extension).toBe(".txt");
    expect(info.isDirectory).toBe(false);
  });

  it("should return correct info for a directory", async () => {
    const dirPath = join(testDir, "subdir");
    await mkdir(dirPath);

    const info = await getFileInfo(dirPath);

    expect(info.path).toBe(dirPath);
    expect(info.name).toBe("subdir");
    expect(info.baseName).toBe("subdir");
    expect(info.extension).toBe("");
    expect(info.isDirectory).toBe(true);
  });

  it("should handle files with multiple extensions", async () => {
    const filePath = join(testDir, "archive.tar.gz");
    await writeFile(filePath, "content");

    const info = await getFileInfo(filePath);

    expect(info.name).toBe("archive.tar.gz");
    expect(info.baseName).toBe("archive.tar");
    expect(info.extension).toBe(".gz");
  });

  it("should handle hidden files", async () => {
    const filePath = join(testDir, ".gitignore");
    await writeFile(filePath, "content");

    const info = await getFileInfo(filePath);

    expect(info.name).toBe(".gitignore");
    expect(info.baseName).toBe(".gitignore");
    expect(info.extension).toBe("");
  });
});

describe("fileExists", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "renaming-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should return true for existing file", async () => {
    const filePath = join(testDir, "exists.txt");
    await writeFile(filePath, "content");

    expect(await fileExists(filePath)).toBe(true);
  });

  it("should return false for non-existing file", async () => {
    const filePath = join(testDir, "does-not-exist.txt");

    expect(await fileExists(filePath)).toBe(false);
  });

  it("should return true for existing directory", async () => {
    const dirPath = join(testDir, "subdir");
    await mkdir(dirPath);

    expect(await fileExists(dirPath)).toBe(true);
  });
});

describe("renameFile", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "renaming-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should rename a file successfully", async () => {
    const filePath = join(testDir, "original.txt");
    await writeFile(filePath, "content");

    const result = await renameFile(filePath, "renamed.txt");

    expect(result.success).toBe(true);
    expect(result.oldPath).toBe(filePath);
    expect(result.newPath).toBe(join(testDir, "renamed.txt"));
    expect(await fileExists(join(testDir, "renamed.txt"))).toBe(true);
    expect(await fileExists(filePath)).toBe(false);
  });

  it("should fail when source does not exist", async () => {
    const filePath = join(testDir, "nonexistent.txt");

    const result = await renameFile(filePath, "renamed.txt");

    expect(result.success).toBe(false);
    expect(result.error).toContain("no longer exists");
  });

  it("should fail when target already exists", async () => {
    const file1 = join(testDir, "file1.txt");
    const file2 = join(testDir, "file2.txt");
    await writeFile(file1, "content1");
    await writeFile(file2, "content2");

    const result = await renameFile(file1, "file2.txt");

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });

  it("should fail for invalid filename", async () => {
    const filePath = join(testDir, "file.txt");
    await writeFile(filePath, "content");

    const result = await renameFile(filePath, "invalid/name.txt");

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot contain");
  });

  it("should fail for empty filename", async () => {
    const filePath = join(testDir, "file.txt");
    await writeFile(filePath, "content");

    const result = await renameFile(filePath, "");

    expect(result.success).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("should prevent path traversal via invalid characters", async () => {
    const filePath = join(testDir, "file.txt");
    await writeFile(filePath, "content");

    // Path traversal attempt using "/" is caught by filename validation
    const result = await renameFile(filePath, "../escaped.txt");

    expect(result.success).toBe(false);
    // Either path traversal or invalid character error is acceptable
    expect(result.error).toMatch(/traversal|cannot contain/i);
  });
});
