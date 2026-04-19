import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import path from "path";
import fs from "fs-extra";
import { createTestDirectory, cleanupTestDirectory } from "./utils/test-helpers";
import { generateUniqueName } from "../common/finder";
import { fsAsync } from "../common/fs-async";

describe("Create Folder", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDirectory();
  });

  afterEach(async () => {
    await cleanupTestDirectory(testDir);
  });

  describe("generateUniqueName", () => {
    it("should return base name when directory is empty", async () => {
      const name = await generateUniqueName(testDir, "untitled folder");
      expect(name).toBe("untitled folder");
    });

    it("should return 'name 2' when base name exists", async () => {
      await fs.mkdir(path.join(testDir, "untitled folder"));
      const name = await generateUniqueName(testDir, "untitled folder");
      expect(name).toBe("untitled folder 2");
    });

    it("should return 'name 3' when name and name 2 exist", async () => {
      await fs.mkdir(path.join(testDir, "untitled folder"));
      await fs.mkdir(path.join(testDir, "untitled folder 2"));
      const name = await generateUniqueName(testDir, "untitled folder");
      expect(name).toBe("untitled folder 3");
    });

    it("should handle custom folder names", async () => {
      await fs.mkdir(path.join(testDir, "My Project"));
      const name = await generateUniqueName(testDir, "My Project");
      expect(name).toBe("My Project 2");
    });
  });

  describe("fsAsync.createDirectory", () => {
    it("should create a directory successfully", async () => {
      const dirPath = path.join(testDir, "new-folder");
      const result = await fsAsync.createDirectory(dirPath);
      expect(result.success).toBe(true);
      expect(await fs.pathExists(dirPath)).toBe(true);
    });

    it("should succeed if directory already exists (ensureDir)", async () => {
      const dirPath = path.join(testDir, "existing");
      await fs.mkdir(dirPath);
      const result = await fsAsync.createDirectory(dirPath);
      expect(result.success).toBe(true);
    });

    it("should create nested directories", async () => {
      const dirPath = path.join(testDir, "a", "b", "c");
      const result = await fsAsync.createDirectory(dirPath);
      expect(result.success).toBe(true);
      expect(await fs.pathExists(dirPath)).toBe(true);
    });
  });

  describe("create folder + move files", () => {
    it("should move files into newly created folder", async () => {
      // create test files
      const file1 = path.join(testDir, "file1.txt");
      const file2 = path.join(testDir, "file2.txt");
      await fs.writeFile(file1, "content1");
      await fs.writeFile(file2, "content2");

      // create folder and move files
      const folderPath = path.join(testDir, "new-folder");
      await fsAsync.createDirectory(folderPath);

      const move1 = await fsAsync.moveFile(file1, path.join(folderPath, "file1.txt"));
      const move2 = await fsAsync.moveFile(file2, path.join(folderPath, "file2.txt"));

      expect(move1.success).toBe(true);
      expect(move2.success).toBe(true);

      // originals should be gone
      expect(await fs.pathExists(file1)).toBe(false);
      expect(await fs.pathExists(file2)).toBe(false);

      // files should exist in new folder
      expect(await fs.pathExists(path.join(folderPath, "file1.txt"))).toBe(true);
      expect(await fs.pathExists(path.join(folderPath, "file2.txt"))).toBe(true);

      // content preserved
      const content = await fs.readFile(path.join(folderPath, "file1.txt"), "utf-8");
      expect(content).toBe("content1");
    });
  });
});
