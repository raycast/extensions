import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sortNotes, SortOrder } from "../utils/sorting";
import { Note } from "../obsidian/internal/notes";
import fs from "fs";
import path from "path";
import os from "os";

vi.mock("@raycast/api");

describe("sorting", () => {
  let tempDir: string;
  let mockNotes: Note[];

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sorting-test-"));

    // Create test files with different timestamps
    const file1 = path.join(tempDir, "alpha.md");
    const file2 = path.join(tempDir, "beta.md");
    const file3 = path.join(tempDir, "gamma.md");

    fs.writeFileSync(file1, "content1");
    await new Promise((resolve) => setTimeout(resolve, 10));
    fs.writeFileSync(file2, "content2");
    await new Promise((resolve) => setTimeout(resolve, 10));
    fs.writeFileSync(file3, "content3");

    mockNotes = [
      {
        title: "Beta Note",
        path: file2,
        lastModified: new Date("2025-01-02"),
        bookmarked: false,
      },
      {
        title: "Alpha Note",
        path: file1,
        lastModified: new Date("2025-01-01"),
        bookmarked: false,
      },
      {
        title: "Gamma Note",
        path: file3,
        lastModified: new Date("2025-01-03"),
        bookmarked: false,
      },
    ];
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("sortNotes", () => {
    it("should preserve order for relevance sort", () => {
      const sorted = sortNotes(mockNotes, "relevance");

      expect(sorted[0].title).toBe("Beta Note");
      expect(sorted[1].title).toBe("Alpha Note");
      expect(sorted[2].title).toBe("Gamma Note");
    });

    it("should not mutate original array", () => {
      const original = [...mockNotes];
      sortNotes(mockNotes, "alphabetical-asc");

      expect(mockNotes).toEqual(original);
    });

    it("should sort alphabetically ascending", () => {
      const sorted = sortNotes(mockNotes, "alphabetical-asc");

      expect(sorted[0].title).toBe("Alpha Note");
      expect(sorted[1].title).toBe("Beta Note");
      expect(sorted[2].title).toBe("Gamma Note");
    });

    it("should sort alphabetically descending", () => {
      const sorted = sortNotes(mockNotes, "alphabetical-desc");

      expect(sorted[0].title).toBe("Gamma Note");
      expect(sorted[1].title).toBe("Beta Note");
      expect(sorted[2].title).toBe("Alpha Note");
    });

    it("should sort by modified date descending (newest first)", () => {
      const sorted = sortNotes(mockNotes, "modified-desc");

      expect(sorted[0].title).toBe("Gamma Note");
      expect(sorted[1].title).toBe("Beta Note");
      expect(sorted[2].title).toBe("Alpha Note");
    });

    it("should sort by modified date ascending (oldest first)", () => {
      const sorted = sortNotes(mockNotes, "modified-asc");

      expect(sorted[0].title).toBe("Alpha Note");
      expect(sorted[1].title).toBe("Beta Note");
      expect(sorted[2].title).toBe("Gamma Note");
    });

    it("should sort by created date descending (newest first)", () => {
      const sorted = sortNotes(mockNotes, "created-desc");

      // Files created in order: file1, file2, file3
      // So file3 (Gamma) should be newest
      expect(sorted[0].title).toBe("Gamma Note");
      expect(sorted[2].title).toBe("Alpha Note");
    });

    it("should sort by created date ascending (oldest first)", () => {
      const sorted = sortNotes(mockNotes, "created-asc");

      // Files created in order: file1, file2, file3
      // So file1 (Alpha) should be oldest
      expect(sorted[0].title).toBe("Alpha Note");
      expect(sorted[2].title).toBe("Gamma Note");
    });

    it("should handle non-existent files gracefully in created sort", () => {
      const notesWithMissing: Note[] = [
        ...mockNotes,
        {
          title: "Missing Note",
          path: "/nonexistent/path.md",
          lastModified: new Date(),
          bookmarked: false,
        },
      ];

      const sorted = sortNotes(notesWithMissing, "created-desc");

      // Should not throw and should include all notes
      expect(sorted.length).toBe(4);
    });

    it("should handle empty array", () => {
      const sorted = sortNotes([], "alphabetical-asc");
      expect(sorted).toEqual([]);
    });

    it("should handle single note", () => {
      const singleNote = [mockNotes[0]];
      const sorted = sortNotes(singleNote, "alphabetical-asc");

      expect(sorted.length).toBe(1);
      expect(sorted[0]).toEqual(mockNotes[0]);
    });

    it("should handle notes with same title", () => {
      const duplicates: Note[] = [
        {
          title: "Same Title",
          path: "/path1.md",
          lastModified: new Date("2025-01-01"),
          bookmarked: false,
        },
        {
          title: "Same Title",
          path: "/path2.md",
          lastModified: new Date("2025-01-02"),
          bookmarked: false,
        },
      ];

      const sorted = sortNotes(duplicates, "alphabetical-asc");
      expect(sorted.length).toBe(2);
      expect(sorted[0].title).toBe("Same Title");
      expect(sorted[1].title).toBe("Same Title");
    });

    it("should handle notes with same modified date", () => {
      const sameDate = new Date("2025-01-01");
      const duplicates: Note[] = [
        {
          title: "Note A",
          path: "/path1.md",
          lastModified: sameDate,
          bookmarked: false,
        },
        {
          title: "Note B",
          path: "/path2.md",
          lastModified: sameDate,
          bookmarked: false,
        },
      ];

      const sorted = sortNotes(duplicates, "modified-desc");
      expect(sorted.length).toBe(2);
    });

    it("should handle case-insensitive sorting correctly", () => {
      const mixedCase: Note[] = [
        {
          title: "zebra",
          path: "/zebra.md",
          lastModified: new Date(),
          bookmarked: false,
        },
        {
          title: "Apple",
          path: "/apple.md",
          lastModified: new Date(),
          bookmarked: false,
        },
        {
          title: "banana",
          path: "/banana.md",
          lastModified: new Date(),
          bookmarked: false,
        },
      ];

      const sorted = sortNotes(mixedCase, "alphabetical-asc");

      // localeCompare handles case-insensitive sorting
      expect(sorted[0].title).toBe("Apple");
      expect(sorted[1].title).toBe("banana");
      expect(sorted[2].title).toBe("zebra");
    });

    it("should return original order for unknown sort order", () => {
      const sorted = sortNotes(mockNotes, "unknown-sort" as SortOrder);

      expect(sorted[0].title).toBe("Beta Note");
      expect(sorted[1].title).toBe("Alpha Note");
      expect(sorted[2].title).toBe("Gamma Note");
    });
  });
});
