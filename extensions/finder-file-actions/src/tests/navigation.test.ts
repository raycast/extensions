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

describe("Navigation Operations", () => {
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

  describe("Directory Traversal", () => {
    it("should correctly list directory contents", async () => {
      const contents = await fs.readdir(testPaths.testFolder1);
      expect(contents).toContain("sub-folder-1");
    });

    it("should handle deep directory traversal", async () => {
      const deepFolder = path.join(testPaths.subFolder1, "deep-folder");
      await fs.mkdir(deepFolder);
      expect(await fs.exists(deepFolder)).toBe(true);
    });

    it("should handle special character paths in navigation", async () => {
      const specialSubFolder = path.join(testPaths.specialFolder, "special sub");
      await fs.mkdir(specialSubFolder);
      expect(await fs.exists(specialSubFolder)).toBe(true);
    });
  });

  describe("Permission Handling", () => {
    it("should handle non-readable directories", async () => {
      const restrictedDir = path.join(testDir, "restricted");
      await fs.mkdir(restrictedDir);
      await fs.chmod(restrictedDir, 0o000);

      try {
        await fs.readdir(restrictedDir);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      } finally {
        await fs.chmod(restrictedDir, 0o777);
      }
    });
  });

  describe("Symlink Handling", () => {
    it("should handle symlinked directories", async () => {
      const linkPath = path.join(testDir, "link");
      await fs.symlink(testPaths.testFolder1, linkPath);
      expect(await fs.exists(linkPath)).toBe(true);
    });

    it("should handle broken symlinks", async () => {
      const nonExistentPath = path.join(testDir, "non-existent");
      const linkPath = path.join(testDir, "broken-link");
      await fs.symlink(nonExistentPath, linkPath);
      expect(await fs.exists(linkPath)).toBe(false);
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

      // Create 100 files
      const promises = Array.from({ length: 100 }, (_, i) =>
        fs.writeFile(path.join(largeDir, `file${i}.txt`), `content ${i}`)
      );
      await Promise.all(promises);

      const contents = await fs.readdir(largeDir);
      expect(contents).toHaveLength(100);
    });

    it("should handle concurrent directory reads", async () => {
      const promises = Array.from({ length: 10 }, () => fs.readdir(testPaths.testFolder1));
      const results = await Promise.all(promises);
      results.forEach((contents) => {
        expect(contents).toContain("sub-folder-1");
      });
    });

    it("should handle macOS hidden files", async () => {
      const hiddenFile = path.join(testPaths.testFolder1, ".hidden");
      await fs.writeFile(hiddenFile, "hidden content");
      const contents = await fs.readdir(testPaths.testFolder1, { withFileTypes: true });
      expect(contents.some((dirent) => dirent.name === ".hidden")).toBe(true);
    });
  });
});
