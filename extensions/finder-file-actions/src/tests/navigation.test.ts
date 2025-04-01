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

describe("Navigation Operations", () => {
  let testDir: string;
  let testStructure: TestStructure;

  beforeEach(async () => {
    testDir = await createTestDirectory();
    testStructure = await createTestFolderStructure(testDir);
  });

  afterEach(async () => {
    await cleanupTestDirectory(testDir);
  });

  describe("Directory Traversal", () => {
    it("should correctly list directory contents", async () => {
      const contents = await fs.readdir(testStructure.testFolder1);
      expect(contents).toContain("SubFolder1");
      expect(contents).toContain("test.txt");
    });

    it("should handle deep directory traversal", async () => {
      // Create deep directory structure
      const deepPath = path.join(testDir, "deep", "path", "to", "folder");
      await fs.mkdirp(deepPath);
      await fs.writeFile(path.join(deepPath, "test.txt"), "deep test");

      // Navigate up level by level
      let currentPath = deepPath;
      while (currentPath !== testDir) {
        const parentPath = path.dirname(currentPath);
        const contents = await fs.readdir(parentPath);
        expect(contents).toContain(path.basename(currentPath));
        currentPath = parentPath;
      }
    });

    it("should handle special character paths in navigation", async () => {
      const specialPath = path.join(testDir, "Special Path (with) [chars]");
      await fs.mkdir(specialPath);
      await fs.writeFile(path.join(specialPath, "test.txt"), "test");

      const contents = await fs.readdir(testDir);
      expect(contents).toContain("Special Path (with) [chars]");

      const specialContents = await fs.readdir(specialPath);
      expect(specialContents).toContain("test.txt");
    });
  });

  describe("Permission Handling", () => {
    it("should handle non-readable directories", async () => {
      const restrictedDir = path.join(testDir, "restricted");
      await fs.mkdir(restrictedDir);
      await fs.chmod(restrictedDir, 0o000);

      await expect(fs.readdir(restrictedDir)).rejects.toThrow();

      // Reset permissions for cleanup
      await fs.chmod(restrictedDir, 0o777);
    });
  });

  describe("Symlink Handling", () => {
    it("should handle symlinked directories", async () => {
      const realDir = path.join(testDir, "real");
      const linkDir = path.join(testDir, "link");

      await fs.mkdir(realDir);
      await fs.writeFile(path.join(realDir, "test.txt"), "test");
      await fs.symlink(realDir, linkDir);

      const contents = await fs.readdir(linkDir);
      expect(contents).toContain("test.txt");

      const stats = await fs.lstat(linkDir);
      expect(stats.isSymbolicLink()).toBe(true);
    });

    it("should handle broken symlinks", async () => {
      const nonExistentPath = path.join(testDir, "nonexistent");
      const linkPath = path.join(testDir, "broken-link");

      await fs.symlink(nonExistentPath, linkPath);

      const linkStats = await fs.lstat(linkPath);
      expect(linkStats.isSymbolicLink()).toBe(true);

      await expect(fs.readdir(linkPath)).rejects.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty directories", async () => {
      const emptyDir = path.join(testDir, "empty");
      await fs.mkdir(emptyDir);

      const contents = await fs.readdir(emptyDir);
      expect(contents).toHaveLength(0);
    });

    it("should handle directories with many entries", async () => {
      const largeDir = path.join(testDir, "large");
      await fs.mkdir(largeDir);

      // Create 1000 empty files
      const promises = Array.from({ length: 1000 }, (_, i) => fs.writeFile(path.join(largeDir, `file${i}.txt`), ""));
      await Promise.all(promises);

      const contents = await fs.readdir(largeDir);
      expect(contents).toHaveLength(1000);
    });

    it("should handle concurrent directory reads", async () => {
      const concurrentDir = path.join(testDir, "concurrent");
      await fs.mkdir(concurrentDir);

      // Create some files
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(path.join(concurrentDir, `file${i}.txt`), `content ${i}`);
      }

      // Read directory concurrently multiple times
      const promises = Array.from({ length: 50 }, () => fs.readdir(concurrentDir));
      const results = await Promise.all(promises);

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toEqual(firstResult);
      });
    });

    it("should handle macOS hidden files", async () => {
      const hiddenDir = path.join(testDir, ".hidden");
      await fs.mkdir(hiddenDir);
      await fs.writeFile(path.join(hiddenDir, ".DS_Store"), "");
      await fs.writeFile(path.join(hiddenDir, ".hidden_file"), "test");
      await fs.writeFile(path.join(hiddenDir, "visible_file"), "test");

      const contents = await fs.readdir(hiddenDir);
      expect(contents).toContain(".DS_Store");
      expect(contents).toContain(".hidden_file");
      expect(contents).toContain("visible_file");
    });
  });
});
