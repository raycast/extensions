import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import path from "path";
import fs from "fs-extra";
import { createTestDirectory, cleanupTestDirectory } from "./utils/test-helpers";
import { generateUniqueName } from "../common/finder";
import { fsAsync } from "../common/fs-async";

describe("Create Text File", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTestDirectory();
  });

  afterEach(async () => {
    await cleanupTestDirectory(testDir);
  });

  describe("generateUniqueName with extension", () => {
    it("should return 'untitled.txt' when directory is empty", async () => {
      const name = await generateUniqueName(testDir, "untitled", "txt");
      expect(name).toBe("untitled.txt");
    });

    it("should return 'untitled 2.txt' when untitled.txt exists", async () => {
      await fs.writeFile(path.join(testDir, "untitled.txt"), "");
      const name = await generateUniqueName(testDir, "untitled", "txt");
      expect(name).toBe("untitled 2.txt");
    });

    it("should return 'untitled 3.md' when 1 and 2 exist", async () => {
      await fs.writeFile(path.join(testDir, "untitled.md"), "");
      await fs.writeFile(path.join(testDir, "untitled 2.md"), "");
      const name = await generateUniqueName(testDir, "untitled", "md");
      expect(name).toBe("untitled 3.md");
    });

    it("should handle various extensions", async () => {
      const name = await generateUniqueName(testDir, "untitled", "json");
      expect(name).toBe("untitled.json");
    });
  });

  describe("fsAsync.writeFile", () => {
    it("should create file with content", async () => {
      const filePath = path.join(testDir, "test.txt");
      const result = await fsAsync.writeFile(filePath, "hello world");
      expect(result.success).toBe(true);
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toBe("hello world");
    });

    it("should create empty file", async () => {
      const filePath = path.join(testDir, "empty.txt");
      const result = await fsAsync.writeFile(filePath, "");
      expect(result.success).toBe(true);
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toBe("");
    });

    it("should handle multiline content", async () => {
      const filePath = path.join(testDir, "multi.txt");
      const multiline = "line 1\nline 2\nline 3";
      const result = await fsAsync.writeFile(filePath, multiline);
      expect(result.success).toBe(true);
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toBe(multiline);
    });

    it("should fail for invalid path", async () => {
      const filePath = path.join(testDir, "nonexistent", "dir", "file.txt");
      const result = await fsAsync.writeFile(filePath, "content");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
