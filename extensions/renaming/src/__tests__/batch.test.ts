import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { mkdtemp, writeFile, readFile, rm, readdir } from "fs/promises";
import { join } from "path";
import { checkConflicts, batchRename } from "../lib/batch";
import { fileExists } from "../lib/files";
import type { RenameOperation } from "../types";

describe("checkConflicts", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "renaming-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

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

describe("batchRename", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "renaming-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

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

    const remaining = await readdir(testDir);
    expect(remaining.every((f) => !f.startsWith(".tmp_rename_"))).toBe(true);
  });

  it("should preserve file contents through chain rename (A→B, B→C)", async () => {
    const fileA = join(testDir, "A.txt");
    const fileB = join(testDir, "B.txt");
    await writeFile(fileA, "content-A");
    await writeFile(fileB, "content-B");

    const results = await batchRename([
      { oldPath: fileA, newName: "B.txt", newPath: fileB },
      { oldPath: fileB, newName: "C.txt", newPath: join(testDir, "C.txt") },
    ]);

    expect(results.every((r) => r.success)).toBe(true);
    expect(await readFile(fileB, "utf-8")).toBe("content-A");
    expect(await readFile(join(testDir, "C.txt"), "utf-8")).toBe("content-B");
    expect(await fileExists(fileA)).toBe(false);
  });

  it("should preserve file contents through three-way rotation (A→B, B→C, C→A)", async () => {
    const fileA = join(testDir, "A.txt");
    const fileB = join(testDir, "B.txt");
    const fileC = join(testDir, "C.txt");
    await writeFile(fileA, "content-A");
    await writeFile(fileB, "content-B");
    await writeFile(fileC, "content-C");

    const results = await batchRename([
      { oldPath: fileA, newName: "B.txt", newPath: fileB },
      { oldPath: fileB, newName: "C.txt", newPath: fileC },
      { oldPath: fileC, newName: "A.txt", newPath: fileA },
    ]);

    expect(results.every((r) => r.success)).toBe(true);
    expect(await readFile(fileA, "utf-8")).toBe("content-C");
    expect(await readFile(fileB, "utf-8")).toBe("content-A");
    expect(await readFile(fileC, "utf-8")).toBe("content-B");
  });

  it("should restore temp file when both operations fail and slot is free", async () => {
    // A→B (A doesn't exist), B→invalid (bad filename)
    // B is needsTemp because A targets its path. Both ops fail,
    // so B's slot stays free and Phase 3 can restore B from temp.
    const fileA = join(testDir, "A.txt"); // does not exist on disk
    const fileB = join(testDir, "B.txt");
    await writeFile(fileB, "content-B");

    const results = await batchRename([
      { oldPath: fileA, newName: "B.txt", newPath: fileB },
      { oldPath: fileB, newName: "invalid/name.txt", newPath: join(testDir, "invalid/name.txt") },
    ]);

    expect(results[0]!.success).toBe(false);
    expect(results[1]!.success).toBe(false);
    // B should be restored to its original path (no temp files stranded)
    expect(await readFile(fileB, "utf-8")).toBe("content-B");
    const remaining = await readdir(testDir);
    expect(remaining.every((f) => !f.startsWith(".tmp_rename_"))).toBe(true);
  });

  it("should handle partial failure when needsTemp target is blocked", async () => {
    // A→B, B→C where C already exists (not part of the batch).
    // B is needsTemp because A targets its slot. If B→C fails, Phase 3
    // must NOT overwrite the successful A→B rename at B's slot.
    const fileA = join(testDir, "A.txt");
    const fileB = join(testDir, "B.txt");
    const fileC = join(testDir, "C.txt");
    await writeFile(fileA, "content-A");
    await writeFile(fileB, "content-B");
    await writeFile(fileC, "blocker");

    const results = await batchRename([
      { oldPath: fileA, newName: "B.txt", newPath: fileB },
      { oldPath: fileB, newName: "C.txt", newPath: fileC },
    ]);

    // B→C should fail (target exists)
    expect(results[1]!.success).toBe(false);
    // A→B should succeed — and Phase 3 must not overwrite it
    expect(results[0]!.success).toBe(true);
    expect(await readFile(fileB, "utf-8")).toBe("content-A");
    // Original blocker at C is untouched
    expect(await readFile(fileC, "utf-8")).toBe("blocker");
    // Original B is stranded at a temp path (slot occupied), but not lost
    const remaining = await readdir(testDir);
    const tempFiles = remaining.filter((f) => f.startsWith(".tmp_rename_"));
    expect(tempFiles).toHaveLength(1);
  });
});
