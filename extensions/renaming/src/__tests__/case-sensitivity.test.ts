/**
 * Case-only renames across both filesystem behaviours.
 *
 * macOS is case-insensitive by default but APFS can be formatted case-sensitive,
 * and neither CI nor a contributor's machine can be assumed to be either. These
 * tests therefore fake the *identity* answer rather than the volume: `isSameEntry`
 * is stubbed to compare exact paths, which is how a case-sensitive volume behaves
 * and is the single fact that separates the two filesystems as far as rename
 * safety is concerned.
 *
 * `paths.test.ts` covers the unfaked primitive, probing the volume it runs on.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "os";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { join } from "path";
import type { RenameOperation } from "../types";
import { renameFile } from "../lib/files";
import { checkConflicts, batchRename } from "../lib/batch";

const volume = vi.hoisted(() => ({ caseSensitive: false }));

vi.mock("../lib/paths", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/paths")>();

  return {
    ...actual,
    isSameEntry: async (a: string, b: string) => (volume.caseSensitive ? a === b : actual.isSameEntry(a, b)),
  };
});

describe("case-only renames", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "renaming-test-"));
    volume.caseSensitive = false;
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("when the destination resolves to the source itself", () => {
    it("should allow the rename", async () => {
      const filePath = join(testDir, "REPORT.txt");
      await writeFile(filePath, "content");

      const result = await renameFile(filePath, "report.txt");

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.newPath).toBe(join(testDir, "report.txt"));
    });

    it("should not report the rename as a conflict", async () => {
      const filePath = join(testDir, "REPORT.txt");
      await writeFile(filePath, "content");

      const operations: RenameOperation[] = [
        { oldPath: filePath, newName: "report.txt", newPath: join(testDir, "report.txt") },
      ];

      expect(await checkConflicts(operations)).toHaveLength(0);
    });
  });

  describe("when the destination is a distinct file differing only in case", () => {
    let source: string;
    let destination: string;
    let operations: RenameOperation[];

    beforeEach(async () => {
      source = join(testDir, "REPORT.txt");
      destination = join(testDir, "report.txt");
      await writeFile(source, "source");
      await writeFile(destination, "destination");
      operations = [{ oldPath: source, newName: "report.txt", newPath: destination }];
      volume.caseSensitive = true;
    });

    it("should refuse the rename instead of overwriting", async () => {
      const result = await renameFile(source, "report.txt");

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("should report it as a batch conflict", async () => {
      const conflicts = await checkConflicts(operations);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain("already exists");
    });

    it("should leave the destination intact when the batch runs anyway", async () => {
      const results = await batchRename(operations);

      expect(results[0]!.success).toBe(false);
      expect(await readFile(destination, "utf8")).toBe("destination");
    });
  });
});
