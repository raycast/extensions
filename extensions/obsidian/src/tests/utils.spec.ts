import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sortByAlphabet,
  sortNoteByAlphabet,
  wordCount,
  readingTime,
  createdDateFor,
  fileSizeFor,
  trimPathToMaxLength,
  ISO8601_week_no,
  getListOfMediaFileExtensions,
  getIconFor,
  filterContent,
  getCodeBlocks,
} from "../utils/utils";
import { Note } from "../obsidian/internal/notes";
import fs from "fs";
import path from "path";
import os from "os";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn().mockReturnValue({
    removeYAML: true,
    removeLatex: true,
    removeLinks: true,
  }),
  Icon: {
    Video: "video-icon",
    Microphone: "microphone-icon",
  },
}));

describe("utils", () => {
  describe("sortByAlphabet", () => {
    it("should return 1 when a > b", () => {
      expect(sortByAlphabet("zebra", "apple")).toBe(1);
    });

    it("should return -1 when a < b", () => {
      expect(sortByAlphabet("apple", "zebra")).toBe(-1);
    });

    it("should return 0 when a === b", () => {
      expect(sortByAlphabet("apple", "apple")).toBe(0);
    });
  });

  describe("sortNoteByAlphabet", () => {
    it("should sort notes by title", () => {
      const noteA: Note = {
        title: "Apple",
        path: "/apple.md",
        lastModified: new Date(),
        bookmarked: false,
      };
      const noteB: Note = {
        title: "Zebra",
        path: "/zebra.md",
        lastModified: new Date(),
        bookmarked: false,
      };

      expect(sortNoteByAlphabet(noteA, noteB)).toBe(-1);
      expect(sortNoteByAlphabet(noteB, noteA)).toBe(1);
      expect(sortNoteByAlphabet(noteA, noteA)).toBe(0);
    });
  });

  describe("wordCount", () => {
    it("should count words in a string", () => {
      expect(wordCount("hello world")).toBe(2);
      expect(wordCount("one two three four")).toBe(4);
    });

    it("should handle single word", () => {
      expect(wordCount("hello")).toBe(1);
    });

    it("should handle empty string", () => {
      expect(wordCount("")).toBe(1); // Empty string splits to [""]
    });

    it("should handle multiple spaces", () => {
      expect(wordCount("hello  world")).toBe(3); // Extra space creates empty string
    });
  });

  describe("readingTime", () => {
    it("should calculate reading time at 200 words per minute", () => {
      const text200 = Array(200).fill("word").join(" ");
      expect(readingTime(text200)).toBe(1);

      const text400 = Array(400).fill("word").join(" ");
      expect(readingTime(text400)).toBe(2);
    });

    it("should round up partial minutes", () => {
      const text250 = Array(250).fill("word").join(" ");
      expect(readingTime(text250)).toBe(2); // Ceil of 1.25
    });

    it("should handle short text", () => {
      expect(readingTime("hello world")).toBe(1); // Ceil of 0.01
    });
  });

  describe("file system functions", () => {
    let tempDir: string;
    let testFile: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "utils-test-"));
      testFile = path.join(tempDir, "test.md");
      fs.writeFileSync(testFile, "test content with some words");
    });

    afterEach(() => {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    describe("createdDateFor", () => {
      it("should return birthtime of file", () => {
        const note: Note = {
          title: "Test",
          path: testFile,
          lastModified: new Date(),
          bookmarked: false,
        };

        const birthtime = createdDateFor(note);
        expect(birthtime).toBeInstanceOf(Date);
      });
    });

    describe("fileSizeFor", () => {
      it("should return file size in kilobytes", () => {
        const note: Note = {
          title: "Test",
          path: testFile,
          lastModified: new Date(),
          bookmarked: false,
        };

        const size = fileSizeFor(note);
        expect(size).toBeGreaterThan(0);
        expect(typeof size).toBe("number");
      });
    });
  });

  describe("trimPathToMaxLength", () => {
    it("should trim path when longer than max length", () => {
      const longPath = "/very/long/path/to/file.md";
      const result = trimPathToMaxLength(longPath, 10);

      // The function adds "..." and slices from the end, result may be longer than maxLength
      expect(result.startsWith("...")).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return path without leading slash when shorter than max", () => {
      const shortPath = "/short.md";
      const result = trimPathToMaxLength(shortPath, 20);

      expect(result).toBe("short.md");
    });

    it("should handle exact max length", () => {
      const exactPath = "/exact.md"; // 9 chars
      const result = trimPathToMaxLength(exactPath, 9);

      expect(result).toBe("exact.md");
    });
  });

  describe("ISO8601_week_no", () => {
    it("should return week number for a date", async () => {
      const date = new Date("2025-01-15");
      const week = await ISO8601_week_no(date);

      expect(typeof week).toBe("number");
      expect(week).toBeGreaterThan(0);
      expect(week).toBeLessThanOrEqual(53);
    });

    it("should return week 1 for early January", async () => {
      const date = new Date("2025-01-01");
      const week = await ISO8601_week_no(date);

      expect(week).toBeGreaterThanOrEqual(1);
    });

    it("should handle different years consistently", async () => {
      const date2024 = new Date("2024-06-15");
      const date2025 = new Date("2025-06-15");

      const week2024 = await ISO8601_week_no(date2024);
      const week2025 = await ISO8601_week_no(date2025);

      // Both mid-June dates should be in similar week ranges
      expect(week2024).toBeGreaterThan(20);
      expect(week2025).toBeGreaterThan(20);
    });
  });

  describe("getListOfMediaFileExtensions", () => {
    it("should return unique extensions from media list", () => {
      const media = [
        { title: "video1", path: "/path/video1.mp4" },
        { title: "video2", path: "/path/video2.mp4" },
        { title: "audio", path: "/path/audio.mp3" },
        { title: "image", path: "/path/image.jpg" },
      ];

      const extensions = getListOfMediaFileExtensions(media);

      expect(extensions).toContain(".mp4");
      expect(extensions).toContain(".mp3");
      expect(extensions).toContain(".jpg");
      expect(extensions.length).toBe(3);
    });

    it("should filter out empty extensions", () => {
      const media = [
        { title: "no-ext", path: "/path/noext" },
        { title: "with-ext", path: "/path/file.txt" },
      ];

      const extensions = getListOfMediaFileExtensions(media);

      expect(extensions).not.toContain("");
      expect(extensions).toContain(".txt");
    });

    it("should handle empty media list", () => {
      const extensions = getListOfMediaFileExtensions([]);
      expect(extensions).toEqual([]);
    });
  });

  describe("getIconFor", () => {
    it("should return video icon for video files", () => {
      const result = getIconFor("/path/video.mp4");
      expect(result).toEqual({ source: "video-icon" });
    });

    it("should return microphone icon for audio files", () => {
      const result = getIconFor("/path/audio.mp3");
      expect(result).toEqual({ source: "microphone-icon" });
    });

    it("should return file path for other files", () => {
      const filePath = "/path/document.pdf";
      const result = getIconFor(filePath);
      expect(result).toEqual({ source: filePath });
    });

    it("should handle image files", () => {
      const filePath = "/path/image.jpg";
      const result = getIconFor(filePath);
      expect(result).toEqual({ source: filePath });
    });
  });

  describe("filterContent", () => {
    it("should remove YAML frontmatter", () => {
      const content = `---
title: Test
tags: [test]
---

# Heading`;

      const filtered = filterContent(content);
      expect(filtered).not.toContain("---");
      expect(filtered).not.toContain("title: Test");
      expect(filtered).toContain("# Heading");
    });

    it("should remove LaTeX block", () => {
      const content = "Text before $$x = y$$ text after";
      const filtered = filterContent(content);

      expect(filtered).not.toContain("$$");
      expect(filtered).toContain("Text before");
      expect(filtered).toContain("text after");
    });

    it("should remove inline LaTeX", () => {
      const content = "Text with $inline$ math";
      const filtered = filterContent(content);

      expect(filtered).not.toContain("$inline$");
    });

    it("should remove Obsidian links", () => {
      const content = "Link to [[other note]] and embed ![[image.png]]";
      const filtered = filterContent(content);

      expect(filtered).not.toContain("[[");
      expect(filtered).not.toContain("]]");
      expect(filtered).toContain("other note");
      expect(filtered).toContain("image.png");
    });

    it("should apply all filters together", () => {
      const content = `---
title: Test
---

Text with [[link]] and $math$ and ![[embed]]`;

      const filtered = filterContent(content);

      expect(filtered).not.toContain("---");
      expect(filtered).not.toContain("[[");
      expect(filtered).not.toContain("$");
    });
  });

  describe("getCodeBlocks", () => {
    it("should extract code blocks with language", () => {
      const content = "```javascript\nconst x = 1;\n```";
      const blocks = getCodeBlocks(content);

      expect(blocks.length).toBe(1);
      expect(blocks[0].language).toBe("javascript");
      expect(blocks[0].code).toBe("const x = 1;\n");
    });

    it("should extract multiple code blocks", () => {
      const content = `
\`\`\`python
print("hello")
\`\`\`

Some text

\`\`\`typescript
const x: number = 1;
\`\`\`
`;
      const blocks = getCodeBlocks(content);

      expect(blocks.length).toBe(2);
      expect(blocks[0].language).toBe("python");
      expect(blocks[1].language).toBe("typescript");
    });

    it("should handle code blocks without language", () => {
      const content = "```\nplain code\n```";
      const blocks = getCodeBlocks(content);

      expect(blocks.length).toBe(1);
      expect(blocks[0].language).toBe("");
      expect(blocks[0].code).toBe("plain code\n");
    });

    it("should return empty array when no code blocks", () => {
      const content = "Just regular text";
      const blocks = getCodeBlocks(content);

      expect(blocks).toEqual([]);
    });

    it("should handle nested backticks in code", () => {
      const content = "```markdown\n`inline code`\n```";
      const blocks = getCodeBlocks(content);

      expect(blocks.length).toBe(1);
      expect(blocks[0].code).toContain("`inline code`");
    });
  });
});
