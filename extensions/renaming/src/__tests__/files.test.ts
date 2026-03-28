import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { mkdtemp, writeFile, rm, mkdir } from "fs/promises";
import { join } from "path";
import { getFileInfo, fileExists, checkConflicts, renameFile, batchRename, generateUniqueFilename } from "../lib/files";
import type { RenameOperation } from "../types";

describe("files", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "renaming-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("getFileInfo", () => {
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

  describe("checkConflicts", () => {
    it("should return empty array when no conflicts", async () => {
      const file1 = join(testDir, "file1.txt");
      const file2 = join(testDir, "file2.txt");
      await writeFile(file1, "content");
      await writeFile(file2, "content");

      const operations: RenameOperation[] = [
        { oldPath: file1, newName: "renamed1.txt", newPath: join(testDir, "renamed1.txt") },
        { oldPath: file2, newName: "renamed2.txt", newPath: join(testDir, "renamed2.txt") },
      ];

      const conflicts = await checkConflicts(operations);
      expect(conflicts).toHaveLength(0);
    });

    it("should detect duplicate target names within batch", async () => {
      const file1 = join(testDir, "file1.txt");
      const file2 = join(testDir, "file2.txt");
      await writeFile(file1, "content");
      await writeFile(file2, "content");

      const operations: RenameOperation[] = [
        { oldPath: file1, newName: "same.txt", newPath: join(testDir, "same.txt") },
        { oldPath: file2, newName: "same.txt", newPath: join(testDir, "same.txt") },
      ];

      const conflicts = await checkConflicts(operations);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some((c) => c.includes("Multiple files"))).toBe(true);
    });

    it("should detect existing target files", async () => {
      const file1 = join(testDir, "file1.txt");
      const existing = join(testDir, "existing.txt");
      await writeFile(file1, "content");
      await writeFile(existing, "content");

      const operations: RenameOperation[] = [{ oldPath: file1, newName: "existing.txt", newPath: existing }];

      const conflicts = await checkConflicts(operations);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some((c) => c.includes("already exists"))).toBe(true);
    });

    it("should detect path traversal attempts", async () => {
      const file1 = join(testDir, "file1.txt");
      await writeFile(file1, "content");

      const operations: RenameOperation[] = [
        { oldPath: file1, newName: "../escape.txt", newPath: join(testDir, "..", "escape.txt") },
      ];

      const conflicts = await checkConflicts(operations);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some((c) => c.includes("traversal"))).toBe(true);
    });

    it("should not flag same file being renamed to itself", async () => {
      const filePath = join(testDir, "file.txt");
      await writeFile(filePath, "content");

      const operations: RenameOperation[] = [{ oldPath: filePath, newName: "file.txt", newPath: filePath }];

      const conflicts = await checkConflicts(operations);
      expect(conflicts).toHaveLength(0);
    });

    it("should not flag within-batch conflicts when target is a source being moved", async () => {
      // Simulates: file-5->file-4, file-6->file-5, file-7->file-6
      const file5 = join(testDir, "file-5.txt");
      const file6 = join(testDir, "file-6.txt");
      const file7 = join(testDir, "file-7.txt");
      await writeFile(file5, "5");
      await writeFile(file6, "6");
      await writeFile(file7, "7");

      const operations: RenameOperation[] = [
        { oldPath: file5, newName: "file-4.txt", newPath: join(testDir, "file-4.txt") },
        { oldPath: file6, newName: "file-5.txt", newPath: join(testDir, "file-5.txt") },
        { oldPath: file7, newName: "file-6.txt", newPath: join(testDir, "file-6.txt") },
      ];

      const conflicts = await checkConflicts(operations);
      expect(conflicts).toHaveLength(0);
    });

    it("should still flag genuine conflicts even with within-batch moves", async () => {
      // file-5 wants to rename to file-4, but file-4 exists and is NOT being moved
      const file4 = join(testDir, "file-4.txt");
      const file5 = join(testDir, "file-5.txt");
      await writeFile(file4, "4");
      await writeFile(file5, "5");

      const operations: RenameOperation[] = [
        { oldPath: file5, newName: "file-4.txt", newPath: join(testDir, "file-4.txt") },
      ];

      const conflicts = await checkConflicts(operations);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some((c) => c.includes("already exists"))).toBe(true);
    });
  });

  describe("renameFile", () => {
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

  describe("batchRename", () => {
    it("should handle within-batch conflicts (shift-down numbering)", async () => {
      // Create files: file-5, file-6, file-7
      for (const n of [5, 6, 7]) {
        await writeFile(join(testDir, `file-${n}.txt`), String(n));
      }

      // Rename: 5->4, 6->5, 7->6
      const operations: RenameOperation[] = [5, 6, 7].map((n) => ({
        oldPath: join(testDir, `file-${n}.txt`),
        newName: `file-${n - 1}.txt`,
        newPath: join(testDir, `file-${n - 1}.txt`),
      }));

      const results = await batchRename(operations);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);

      // Verify files exist at new locations
      expect(await fileExists(join(testDir, "file-4.txt"))).toBe(true);
      expect(await fileExists(join(testDir, "file-5.txt"))).toBe(true);
      expect(await fileExists(join(testDir, "file-6.txt"))).toBe(true);
      // Old file-7 should be gone
      expect(await fileExists(join(testDir, "file-7.txt"))).toBe(false);
    });

    it("should handle name swaps (A->B, B->A)", async () => {
      const fileA = join(testDir, "alpha.txt");
      const fileB = join(testDir, "beta.txt");
      await writeFile(fileA, "A");
      await writeFile(fileB, "B");

      const operations: RenameOperation[] = [
        { oldPath: fileA, newName: "beta.txt", newPath: fileB },
        { oldPath: fileB, newName: "alpha.txt", newPath: fileA },
      ];

      const results = await batchRename(operations);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);

      // Verify results track original paths for undo
      expect(results[0]!.oldPath).toBe(fileA);
      expect(results[1]!.oldPath).toBe(fileB);
    });

    it("should preserve original oldPath in results for undo history", async () => {
      const file5 = join(testDir, "file-5.txt");
      const file6 = join(testDir, "file-6.txt");
      await writeFile(file5, "5");
      await writeFile(file6, "6");

      const operations: RenameOperation[] = [
        { oldPath: file5, newName: "file-4.txt", newPath: join(testDir, "file-4.txt") },
        { oldPath: file6, newName: "file-5.txt", newPath: join(testDir, "file-5.txt") },
      ];

      const results = await batchRename(operations);

      // Results should have original paths, not temp paths
      expect(results[0]!.oldPath).toBe(file5);
      expect(results[0]!.newPath).toBe(join(testDir, "file-4.txt"));
      expect(results[1]!.oldPath).toBe(file6);
      expect(results[1]!.newPath).toBe(join(testDir, "file-5.txt"));
    });

    it("should not leave temp files behind on success", async () => {
      const file1 = join(testDir, "a.txt");
      const file2 = join(testDir, "b.txt");
      await writeFile(file1, "1");
      await writeFile(file2, "2");

      await batchRename([
        { oldPath: file1, newName: "b.txt", newPath: file2 },
        { oldPath: file2, newName: "c.txt", newPath: join(testDir, "c.txt") },
      ]);

      // No temp files should remain
      const { readdir } = await import("fs/promises");
      const remaining = await readdir(testDir);
      expect(remaining.every((f) => !f.startsWith(".tmp_rename_"))).toBe(true);
    });
  });

  describe("generateUniqueFilename", () => {
    it("should return original name when no conflict", async () => {
      const name = await generateUniqueFilename(testDir, "unique", ".txt");
      expect(name).toBe("unique.txt");
    });

    it("should append number when conflict exists", async () => {
      await writeFile(join(testDir, "file.txt"), "content");

      const name = await generateUniqueFilename(testDir, "file", ".txt");
      expect(name).toBe("file (1).txt");
    });

    it("should increment number for multiple conflicts", async () => {
      await writeFile(join(testDir, "file.txt"), "content");
      await writeFile(join(testDir, "file (1).txt"), "content");
      await writeFile(join(testDir, "file (2).txt"), "content");

      const name = await generateUniqueFilename(testDir, "file", ".txt");
      expect(name).toBe("file (3).txt");
    });

    it("should handle files without extension", async () => {
      await writeFile(join(testDir, "README"), "content");

      const name = await generateUniqueFilename(testDir, "README", "");
      expect(name).toBe("README (1)");
    });
  });
});
