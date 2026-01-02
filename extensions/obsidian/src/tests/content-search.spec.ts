import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { searchNotesWithContent } from "../api/search/simple-content-search.service";
import fs from "fs";
import path from "path";
import os from "os";
import { Note } from "@/obsidian";

describe("content search", () => {
  let tempDir: string;
  let testNotes: Note[];

  beforeEach(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "content-search-test-"));

    // Create test files
    fs.writeFileSync(path.join(tempDir, "note1.md"), "This is a note about programming");
    fs.writeFileSync(path.join(tempDir, "note2.md"), "Another note about cooking recipes");
    fs.writeFileSync(path.join(tempDir, "javascript.md"), "Content about typescript and javascript");
    fs.writeFileSync(path.join(tempDir, "hidden.md"), "This file has secret information inside");

    testNotes = [
      {
        title: "Note 1",
        path: path.join(tempDir, "note1.md"),
        lastModified: new Date(),
        bookmarked: false,
      },
      {
        title: "Note 2",
        path: path.join(tempDir, "note2.md"),
        lastModified: new Date(),
        bookmarked: false,
      },
      {
        title: "JavaScript Guide",
        path: path.join(tempDir, "javascript.md"),
        lastModified: new Date(),
        bookmarked: false,
      },
      {
        title: "Hidden",
        path: path.join(tempDir, "hidden.md"),
        lastModified: new Date(),
        bookmarked: false,
      },
    ];
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("searchNotesWithContent", () => {
    it("should find notes by title match", async () => {
      const results = await searchNotesWithContent(testNotes, "JavaScript");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((n) => n.title === "JavaScript Guide")).toBe(true);
    });

    it("should find notes by path match", async () => {
      const results = await searchNotesWithContent(testNotes, "javascript.md");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((n) => n.path.includes("javascript.md"))).toBe(true);
    });

    it("should find notes by content match", async () => {
      const results = await searchNotesWithContent(testNotes, "programming");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((n) => n.title === "Note 1")).toBe(true);
    });

    it("should find notes by content when title doesn't match", async () => {
      const results = await searchNotesWithContent(testNotes, "secret");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((n) => n.title === "Hidden")).toBe(true);
    });

    it("should return title/path matches first, then content matches", async () => {
      const results = await searchNotesWithContent(testNotes, "javascript");
      // JavaScript Guide should come before notes that only match in content
      const titleMatchIndex = results.findIndex((n) => n.title === "JavaScript Guide");
      expect(titleMatchIndex).toBe(0); // Should be first since it matches title
    });

    it("should handle case-insensitive content search", async () => {
      const results = await searchNotesWithContent(testNotes, "PROGRAMMING");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((n) => n.title === "Note 1")).toBe(true);
    });

    it("should return empty array for no matches", async () => {
      const results = await searchNotesWithContent(testNotes, "nonexistent");
      expect(results.length).toBe(0);
    });

    it("should return all notes for empty query", async () => {
      const results = await searchNotesWithContent(testNotes, "");
      expect(results.length).toBe(testNotes.length);
    });

    it("should handle notes with non-existent files gracefully", async () => {
      const notesWithMissing = [
        ...testNotes,
        {
          title: "Missing",
          path: path.join(tempDir, "nonexistent.md"),
          lastModified: new Date(),
          bookmarked: false,
        },
      ];

      const results = await searchNotesWithContent(notesWithMissing, "programming");
      expect(results.length).toBeGreaterThan(0);
      // Should still find other notes despite missing file
      expect(results.some((n) => n.title === "Note 1")).toBe(true);
    });

    it("should not duplicate results (title match should not also appear in content matches)", async () => {
      const results = await searchNotesWithContent(testNotes, "javascript");
      const paths = results.map((n) => n.path);
      const uniquePaths = new Set(paths);
      expect(paths.length).toBe(uniquePaths.size);
    });

    describe("exact title matches", () => {
      beforeEach(() => {
        // Add notes with similar titles
        fs.writeFileSync(path.join(tempDir, "linear-regression.md"), "Content about ML");
        fs.writeFileSync(path.join(tempDir, "linear-regression-advanced.md"), "Advanced linear regression techniques");
        fs.writeFileSync(path.join(tempDir, "logistic-regression.md"), "Linear regression mentioned in content");

        testNotes = [
          {
            title: "Linear Regression",
            path: path.join(tempDir, "linear-regression.md"),
            lastModified: new Date("2025-01-01"),
            bookmarked: false,
          },
          {
            title: "Linear Regression Advanced",
            path: path.join(tempDir, "linear-regression-advanced.md"),
            lastModified: new Date("2025-01-02"),
            bookmarked: false,
          },
          {
            title: "Logistic Regression",
            path: path.join(tempDir, "logistic-regression.md"),
            lastModified: new Date("2025-01-03"),
            bookmarked: false,
          },
        ];
      });

      it("should rank exact title match first", async () => {
        const results = await searchNotesWithContent(testNotes, "Linear Regression");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].title).toBe("Linear Regression");
      });

      it("should rank exact title match first (case insensitive)", async () => {
        const results = await searchNotesWithContent(testNotes, "linear regression");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].title).toBe("Linear Regression");
      });

      it("should rank exact match before prefix match", async () => {
        const results = await searchNotesWithContent(testNotes, "Linear Regression");
        const exactIndex = results.findIndex((n) => n.title === "Linear Regression");
        const prefixIndex = results.findIndex((n) => n.title === "Linear Regression Advanced");
        expect(exactIndex).toBeLessThan(prefixIndex);
      });
    });

    describe("multi-word search queries", () => {
      beforeEach(() => {
        fs.writeFileSync(path.join(tempDir, "machine-learning.md"), "Content about AI");
        fs.writeFileSync(path.join(tempDir, "deep-learning.md"), "Machine learning is mentioned here");
        fs.writeFileSync(path.join(tempDir, "ml-basics.md"), "Machine learning basics");

        testNotes = [
          {
            title: "Machine Learning",
            path: path.join(tempDir, "machine-learning.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
          {
            title: "Deep Learning",
            path: path.join(tempDir, "deep-learning.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
          {
            title: "ML Basics",
            path: path.join(tempDir, "ml-basics.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
        ];
      });

      it("should find exact match with multi-word query", async () => {
        const results = await searchNotesWithContent(testNotes, "Machine Learning");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].title).toBe("Machine Learning");
      });

      it("should handle multi-word query with space", async () => {
        const results = await searchNotesWithContent(testNotes, "machine learning");
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((n) => n.title === "Machine Learning")).toBe(true);
      });

      it("should prioritize title match over content match for multi-word query", async () => {
        const results = await searchNotesWithContent(testNotes, "machine learning");
        const titleMatchIndex = results.findIndex((n) => n.title === "Machine Learning");
        const contentMatchIndex = results.findIndex((n) => n.title === "Deep Learning");
        expect(titleMatchIndex).toBeLessThan(contentMatchIndex);
      });
    });

    describe("tag search syntax", () => {
      beforeEach(() => {
        // Create notes with tags
        fs.writeFileSync(path.join(tempDir, "todo1.md"), "---\ntags:\n  - todo\n  - important\n---\nTask to complete");
        fs.writeFileSync(path.join(tempDir, "todo2.md"), "Some content #todo about tasks");
        fs.writeFileSync(
          path.join(tempDir, "done.md"),
          "---\ntags:\n  - completed\n---\nCompleted task with #todo mentioned"
        );
        fs.writeFileSync(path.join(tempDir, "encoding.md"), "---\ntags:\n  - todo\n---\nContent about encoding");

        testNotes = [
          {
            title: "Todo 1",
            path: path.join(tempDir, "todo1.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
          {
            title: "Todo 2",
            path: path.join(tempDir, "todo2.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
          {
            title: "Done",
            path: path.join(tempDir, "done.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
          {
            title: "Encoding",
            path: path.join(tempDir, "encoding.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
        ];
      });

      it("should filter by tag using tag: syntax", async () => {
        const results = await searchNotesWithContent(testNotes, "tag:todo");
        expect(results.length).toBe(4); // Todo 1, Todo 2, Encoding, and Done (has inline #todo)
        const resultTitles = results.map((n) => n.title).sort();
        expect(resultTitles).toEqual(["Done", "Encoding", "Todo 1", "Todo 2"]);
      });

      it("should combine tag filter with search query", async () => {
        const results = await searchNotesWithContent(testNotes, "tag:todo encoding");
        expect(results.length).toBe(1); // Only "Encoding" matches both tag:todo AND "encoding"
        expect(results[0].title).toBe("Encoding");
      });

      it("should handle tag: syntax case insensitively", async () => {
        const results = await searchNotesWithContent(testNotes, "tag:TODO");
        expect(results.length).toBeGreaterThanOrEqual(2);
      });

      it("should return only tag-filtered notes when no additional search term", async () => {
        const results = await searchNotesWithContent(testNotes, "tag:completed");
        expect(results.length).toBe(1);
        expect(results[0].title).toBe("Done");
      });
    });

    describe("content vs title matching priority", () => {
      beforeEach(() => {
        fs.writeFileSync(path.join(tempDir, "python-guide.md"), "A comprehensive guide to Python programming");
        fs.writeFileSync(path.join(tempDir, "javascript-intro.md"), "Introduction to JavaScript and Python basics");
        fs.writeFileSync(path.join(tempDir, "random.md"), "Python is mentioned deep in this content somewhere");

        testNotes = [
          {
            title: "Python Guide",
            path: path.join(tempDir, "python-guide.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
          {
            title: "JavaScript Intro",
            path: path.join(tempDir, "javascript-intro.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
          {
            title: "Random",
            path: path.join(tempDir, "random.md"),
            lastModified: new Date(),
            bookmarked: false,
          },
        ];
      });

      it("should prioritize title matches over content matches", async () => {
        const results = await searchNotesWithContent(testNotes, "Python");
        expect(results.length).toBeGreaterThanOrEqual(2);
        // Python Guide (title match) should come before Random (content match)
        const titleMatchIndex = results.findIndex((n) => n.title === "Python Guide");
        const contentMatchIndex = results.findIndex((n) => n.title === "Random");
        expect(titleMatchIndex).toBeLessThan(contentMatchIndex);
      });

      it("should include both title and content matches", async () => {
        const results = await searchNotesWithContent(testNotes, "Python");
        expect(results.some((n) => n.title === "Python Guide")).toBe(true); // title match
        expect(results.some((n) => n.title === "JavaScript Intro")).toBe(true); // content match
        expect(results.some((n) => n.title === "Random")).toBe(true); // content match
      });
    });

    describe("edge cases", () => {
      it("should handle empty string query", async () => {
        const results = await searchNotesWithContent(testNotes, "");
        expect(results.length).toBe(testNotes.length);
      });

      it("should handle whitespace-only query", async () => {
        const results = await searchNotesWithContent(testNotes, "   ");
        expect(results.length).toBe(testNotes.length);
      });

      it("should handle special characters in query", async () => {
        fs.writeFileSync(path.join(tempDir, "special.md"), "Content with @#$% special chars");
        testNotes.push({
          title: "Special Chars",
          path: path.join(tempDir, "special.md"),
          lastModified: new Date(),
          bookmarked: false,
        });

        const results = await searchNotesWithContent(testNotes, "@#$%");
        expect(results.length).toBeGreaterThan(0);
      });

      it("should handle very long query strings", async () => {
        const longQuery = "a".repeat(1000);
        const results = await searchNotesWithContent(testNotes, longQuery);
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      });

      it("should handle unicode characters", async () => {
        fs.writeFileSync(path.join(tempDir, "unicode.md"), "Content with 你好 and émojis 🎉");
        testNotes.push({
          title: "Unicode Note",
          path: path.join(tempDir, "unicode.md"),
          lastModified: new Date(),
          bookmarked: false,
        });

        const results = await searchNotesWithContent(testNotes, "你好");
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((n) => n.title === "Unicode Note")).toBe(true);
      });

      it("should handle queries with multiple spaces", async () => {
        const results = await searchNotesWithContent(testNotes, "Note    1");
        expect(results.length).toBeGreaterThanOrEqual(0);
      });

      it("should handle empty notes array", async () => {
        const results = await searchNotesWithContent([], "query");
        expect(results).toEqual([]);
      });
    });
  });
});
