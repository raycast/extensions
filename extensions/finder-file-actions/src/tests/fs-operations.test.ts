import { beforeEach, afterEach, describe, it, expect } from "@jest/globals";
import path from "path";
import fs from "fs-extra";
import { createTestDirectory, cleanupTestDirectory } from "./utils/test-helpers";

interface TestPaths {
  baseDir: string;
  testFolder1: string;
  testFolder2: string;
  subFolder1: string;
  specialFolder: string;
  testFile: string;
}

describe("File System Operations", () => {
  let testDir: string;
  let testPaths: TestPaths;

  beforeEach(async () => {
    testDir = await createTestDirectory();

    // Create test structure
    testPaths = {
      baseDir: testDir,
      testFolder1: path.join(testDir, "test-folder-1"),
      testFolder2: path.join(testDir, "test-folder-2"),
      subFolder1: path.join(testDir, "test-folder-1", "sub-folder-1"),
      specialFolder: path.join(testDir, "special folder with spaces"),
      testFile: path.join(testDir, "test-file.txt"),
    };

    // Create directories
    await fs.mkdir(testPaths.testFolder1);
    await fs.mkdir(testPaths.testFolder2);
    await fs.mkdir(testPaths.subFolder1);
    await fs.mkdir(testPaths.specialFolder);

    // Create test file
    await fs.writeFile(testPaths.testFile, "test content");
  });

  afterEach(async () => {
    await cleanupTestDirectory(testDir);
  });

  it("should correctly check if files and folders exist", async () => {
    expect(await fs.exists(testPaths.testFolder1)).toBe(true);
    expect(await fs.exists(testPaths.testFile)).toBe(true);
  });

  it("should correctly identify directories", async () => {
    const stats = await fs.stat(testPaths.testFolder1);
    expect(stats.isDirectory()).toBe(true);
  });

  it("should read directory contents correctly", async () => {
    const contents = await fs.readdir(testPaths.testFolder1);
    expect(contents).toContain("sub-folder-1");
  });

  it("should handle special characters in folder names", async () => {
    expect(await fs.exists(testPaths.specialFolder)).toBe(true);
    const stats = await fs.stat(testPaths.specialFolder);
    expect(stats.isDirectory()).toBe(true);
  });

  it("should handle file operations with special character paths", async () => {
    const specialFile = path.join(testPaths.specialFolder, "test.txt");
    await fs.writeFile(specialFile, "test content");
    expect(await fs.exists(specialFile)).toBe(true);
    expect(await fs.readFile(specialFile, "utf8")).toBe("test content");
  });
});
