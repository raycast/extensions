import { beforeEach, afterEach, describe, it, expect } from "@jest/globals";
import path from "path";
import fs from "fs-extra";
import { createTestDirectory, cleanupTestDirectory } from "./utils/test-helpers";
import { fsAsync } from "../common/fs-async";

describe("Async File System Operations", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDirectory();
  });

  afterEach(async () => {
    await cleanupTestDirectory(testDir);
  });

  describe("Basic Operations", () => {
    it("should check if file exists", async () => {
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "test");

      expect(await fsAsync.exists(testFile)).toBe(true);
      expect(await fsAsync.exists(path.join(testDir, "nonexistent"))).toBe(false);
    });

    it("should get file stats", async () => {
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "test");

      const stats = await fsAsync.getStats(testFile);
      expect(stats).not.toBeNull();
      expect(stats?.isDirectory).toBe(false);
      expect(stats?.size).toBe(4);

      const nonExistentStats = await fsAsync.getStats(path.join(testDir, "nonexistent"));
      expect(nonExistentStats).toBeNull();
    });

    it("should read directory contents", async () => {
      await fs.writeFile(path.join(testDir, "file1.txt"), "test1");
      await fs.writeFile(path.join(testDir, "file2.txt"), "test2");

      const contents = await fsAsync.readDirectory(testDir);
      expect(contents).toContain("file1.txt");
      expect(contents).toContain("file2.txt");

      const nonExistentContents = await fsAsync.readDirectory(path.join(testDir, "nonexistent"));
      expect(nonExistentContents).toEqual([]);
    });
  });

  describe("File Operations", () => {
    it("should move file with progress tracking", async () => {
      const sourcePath = path.join(testDir, "source.txt");
      const destPath = path.join(testDir, "dest.txt");
      const content = "test".repeat(1000); // 4KB file
      await fs.writeFile(sourcePath, content);

      let progressCalled = false;
      const result = await fsAsync.moveFile(sourcePath, destPath, {
        onProgress: (percent) => {
          progressCalled = true;
          expect(percent).toBeGreaterThanOrEqual(0);
          expect(percent).toBeLessThanOrEqual(100);
        },
      });

      expect(result.success).toBe(true);
      expect(await fsAsync.exists(sourcePath)).toBe(false);
      expect(await fsAsync.exists(destPath)).toBe(true);
      expect(progressCalled).toBe(false); // Small file, shouldn't use progress
    });

    it("should copy file with progress tracking", async () => {
      const sourcePath = path.join(testDir, "source.txt");
      const destPath = path.join(testDir, "dest.txt");
      const content = "test".repeat(1000); // 4KB file
      await fs.writeFile(sourcePath, content);

      let progressCalled = false;
      const result = await fsAsync.copyFile(sourcePath, destPath, {
        onProgress: (percent) => {
          progressCalled = true;
          expect(percent).toBeGreaterThanOrEqual(0);
          expect(percent).toBeLessThanOrEqual(100);
        },
      });

      expect(result.success).toBe(true);
      expect(await fsAsync.exists(sourcePath)).toBe(true);
      expect(await fsAsync.exists(destPath)).toBe(true);
      expect(progressCalled).toBe(false); // Small file, shouldn't use progress
    });

    it("should handle existing destination files", async () => {
      const sourcePath = path.join(testDir, "source.txt");
      const destPath = path.join(testDir, "dest.txt");
      await fs.writeFile(sourcePath, "source");
      await fs.writeFile(destPath, "dest");

      // Without overwrite
      let result = await fsAsync.moveFile(sourcePath, destPath);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("already exists");

      // With overwrite
      result = await fsAsync.moveFile(sourcePath, destPath, { overwrite: true });
      expect(result.success).toBe(true);
      expect(await fs.readFile(destPath, "utf8")).toBe("source");
    });
  });

  describe("Batch Processing", () => {
    it("should process multiple files concurrently", async () => {
      // Create test files
      const files = Array.from({ length: 10 }, (_, i) => path.join(testDir, `file${i}.txt`));
      await Promise.all(files.map((file) => fs.writeFile(file, "test")));

      let completed = 0;
      const results = await fsAsync.batchProcess(
        files,
        async (file) => {
          const destFile = file.replace(".txt", ".bak");
          const result = await fsAsync.copyFile(file, destFile);
          return result.success;
        },
        {
          concurrency: 3,
          onProgress: (done, total) => {
            completed = done;
            expect(total).toBe(files.length);
          },
        }
      );

      expect(results).toHaveLength(files.length);
      expect(results.every((r) => r === true)).toBe(true);
      expect(completed).toBe(files.length);

      // Verify all backup files were created
      for (const file of files) {
        const bakFile = file.replace(".txt", ".bak");
        expect(await fsAsync.exists(bakFile)).toBe(true);
      }
    });
  });
});
