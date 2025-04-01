import { beforeEach, afterEach, describe, it, expect } from "@jest/globals";
import path from "path";
import fs from "fs-extra";
import { createTestDirectory, cleanupTestDirectory } from "./utils/test-helpers";
import { fsAsync } from "../common/fs-async";

describe("File Operations", () => {
  let testDir: string;
  let sourceDir: string;
  let destDir: string;
  let readOnlyDir: string;

  beforeEach(async () => {
    testDir = await createTestDirectory();
    sourceDir = path.join(testDir, "source");
    destDir = path.join(testDir, "destination");
    readOnlyDir = path.join(testDir, "readonly");

    // Create test directories
    await fs.mkdir(sourceDir);
    await fs.mkdir(destDir);
    await fs.mkdir(readOnlyDir);

    // Create test files
    await fs.writeFile(path.join(sourceDir, "test1.txt"), "test content 1");
    await fs.writeFile(path.join(sourceDir, "test2.txt"), "test content 2");
    await fs.writeFile(path.join(sourceDir, "test3.txt"), "test content 3");

    // Set readonly permissions
    try {
      await fs.chmod(readOnlyDir, 0o444);
    } catch (error) {
      console.error("Failed to set readonly permissions:", error);
    }
  });

  afterEach(async () => {
    try {
      // Reset permissions before cleanup
      await fs.chmod(readOnlyDir, 0o777).catch(() => {});
    } catch (error) {
      console.error("Failed to reset permissions:", error);
    }
    await cleanupTestDirectory(testDir);
  });

  describe("Move Operations", () => {
    it("should move multiple files correctly", async () => {
      const files = ["test1.txt", "test2.txt", "test3.txt"];

      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);
        const result = await fsAsync.moveFile(sourcePath, destPath);

        // Verify move was successful
        expect(result.success).toBe(true);
        expect(await fsAsync.exists(sourcePath)).toBe(false);
        expect(await fsAsync.exists(destPath)).toBe(true);

        // Verify content remains intact
        const content = await fs.readFile(destPath, "utf8");
        expect(content).toBe(`test content ${file.charAt(4)}`);
      }
    });

    it("should handle moving to existing files with overwrite", async () => {
      const testFile = "test1.txt";
      const sourcePath = path.join(sourceDir, testFile);
      const destPath = path.join(destDir, testFile);

      // Create a file at destination
      await fs.writeFile(destPath, "original content");

      // Move with overwrite
      const result = await fsAsync.moveFile(sourcePath, destPath, { overwrite: true });

      // Verify move was successful
      expect(result.success).toBe(true);
      expect(await fsAsync.exists(sourcePath)).toBe(false);
      expect(await fsAsync.exists(destPath)).toBe(true);

      // Verify content was overwritten
      const content = await fs.readFile(destPath, "utf8");
      expect(content).toBe("test content 1");
    });

    it("should fail when moving to readonly directory", async () => {
      const testFile = "test1.txt";
      const sourcePath = path.join(sourceDir, testFile);
      const destPath = path.join(readOnlyDir, testFile);

      const result = await fsAsync.moveFile(sourcePath, destPath);

      // Verify move failed
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(await fsAsync.exists(sourcePath)).toBe(true);
    });
  });

  describe("Copy Operations", () => {
    it("should copy multiple files correctly", async () => {
      const files = ["test1.txt", "test2.txt", "test3.txt"];

      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);
        const result = await fsAsync.copyFile(sourcePath, destPath);

        // Verify copy was successful
        expect(result.success).toBe(true);
        expect(await fsAsync.exists(sourcePath)).toBe(true);
        expect(await fsAsync.exists(destPath)).toBe(true);

        // Verify content is identical
        const sourceContent = await fs.readFile(sourcePath, "utf8");
        const destContent = await fs.readFile(destPath, "utf8");
        expect(sourceContent).toBe(destContent);
      }
    });

    it("should handle copying to existing files with overwrite", async () => {
      const testFile = "test1.txt";
      const sourcePath = path.join(sourceDir, testFile);
      const destPath = path.join(destDir, testFile);

      // Create a file at destination
      await fs.writeFile(destPath, "original content");

      // Copy with overwrite
      const result = await fsAsync.copyFile(sourcePath, destPath, { overwrite: true });

      // Verify copy was successful
      expect(result.success).toBe(true);
      expect(await fsAsync.exists(sourcePath)).toBe(true);
      expect(await fsAsync.exists(destPath)).toBe(true);

      // Verify content was overwritten
      const content = await fs.readFile(destPath, "utf8");
      expect(content).toBe("test content 1");
    });

    it("should fail when copying to readonly directory", async () => {
      const testFile = "test1.txt";
      const sourcePath = path.join(sourceDir, testFile);
      const destPath = path.join(readOnlyDir, testFile);

      const result = await fsAsync.copyFile(sourcePath, destPath);

      // Verify copy failed
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(await fsAsync.exists(sourcePath)).toBe(true);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple concurrent copy operations", async () => {
      const files = ["test1.txt", "test2.txt", "test3.txt"];
      const copyPromises = files.map((file) => fsAsync.copyFile(path.join(sourceDir, file), path.join(destDir, file)));

      const results = await Promise.all(copyPromises);

      // Verify all copies were successful
      results.forEach((result) => expect(result.success).toBe(true));

      // Verify all files were copied correctly
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);

        expect(await fsAsync.exists(sourcePath)).toBe(true);
        expect(await fsAsync.exists(destPath)).toBe(true);

        const sourceContent = await fs.readFile(sourcePath, "utf8");
        const destContent = await fs.readFile(destPath, "utf8");
        expect(sourceContent).toBe(destContent);
      }
    });

    it("should handle multiple concurrent move operations", async () => {
      const files = ["test1.txt", "test2.txt", "test3.txt"];
      const movePromises = files.map((file) => fsAsync.moveFile(path.join(sourceDir, file), path.join(destDir, file)));

      const results = await Promise.all(movePromises);

      // Verify all moves were successful
      results.forEach((result) => expect(result.success).toBe(true));

      // Verify all files were moved correctly
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(destDir, file);

        expect(await fsAsync.exists(sourcePath)).toBe(false);
        expect(await fsAsync.exists(destPath)).toBe(true);
      }
    });
  });

  describe("Large Directory Operations", () => {
    it("should handle copying large number of files", async () => {
      const largeDir = path.join(testDir, "large");
      await fs.mkdir(largeDir);

      // Create 100 small files
      const fileCount = 100;
      const filePromises = Array.from({ length: fileCount }, (_, i) =>
        fs.writeFile(path.join(largeDir, `file${i}.txt`), `content ${i}`)
      );
      await Promise.all(filePromises);

      const largeDest = path.join(testDir, "large-dest");
      await fs.mkdir(largeDest);

      // Copy files using batch processing
      const sourceFiles = await fs.readdir(largeDir);
      const copyResults = await fsAsync.batchProcess(
        sourceFiles.map((file) => path.join(largeDir, file)),
        async (sourcePath) => {
          const fileName = path.basename(sourcePath);
          const destPath = path.join(largeDest, fileName);
          return fsAsync.copyFile(sourcePath, destPath);
        },
        { concurrency: 10 }
      );

      // Verify all copies were successful
      copyResults.forEach((result) => expect(result.success).toBe(true));

      // Verify content of random files
      for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * fileCount);
        const fileName = `file${randomIndex}.txt`;
        const sourceContent = await fs.readFile(path.join(largeDir, fileName), "utf8");
        const destContent = await fs.readFile(path.join(largeDest, fileName), "utf8");
        expect(sourceContent).toBe(destContent);
      }
    });
  });
});
