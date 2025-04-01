import { beforeEach, afterEach, describe, it, expect } from "@jest/globals";
import path from "path";
import fs from "fs-extra";
import { createTestDirectory, cleanupTestDirectory, createTestFolderStructure } from "./utils/test-helpers";

interface TestStructure {
  baseDir: string;
  testFolder1: string;
  testFolder2: string;
  subFolder1: string;
  specialFolder: string;
  testFile: string;
}

describe("File System Operations", () => {
  let testDir: string;
  let testStructure: TestStructure;

  beforeEach(async () => {
    testDir = await createTestDirectory();
    testStructure = await createTestFolderStructure(testDir);
  });

  afterEach(async () => {
    await cleanupTestDirectory(testDir);
  });

  it("should correctly check if files and folders exist", async () => {
    expect(await fs.exists(testStructure.testFolder1)).toBe(true);
    expect(await fs.exists(testStructure.testFile)).toBe(true);
    expect(await fs.exists(path.join(testDir, "NonExistent"))).toBe(false);
  });

  it("should correctly identify directories", async () => {
    const stats = await fs.stat(testStructure.testFolder1);
    expect(stats.isDirectory()).toBe(true);
  });

  it("should read directory contents correctly", async () => {
    const contents = await fs.readdir(testStructure.testFolder1);
    expect(contents).toContain("SubFolder1");
    expect(contents).toContain("test.txt");
  });

  it("should handle special characters in folder names", async () => {
    expect(await fs.exists(testStructure.specialFolder)).toBe(true);
    const stats = await fs.stat(testStructure.specialFolder);
    expect(stats.isDirectory()).toBe(true);
  });

  it("should handle file operations with special character paths", async () => {
    const specialFile = path.join(testStructure.specialFolder, "test.txt");
    await fs.writeFile(specialFile, "test content");
    expect(await fs.exists(specialFile)).toBe(true);
    expect(await fs.readFile(specialFile, "utf8")).toBe("test content");
  });
});
