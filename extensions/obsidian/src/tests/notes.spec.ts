import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { appendText, createProperties, writeMarkdown, deleteNote, isNote, Note } from "../obsidian/internal/notes";
import fs from "fs";
import path from "path";
import os from "os";
import { showToast } from "@raycast/api";

vi.mock("@raycast/api");

describe("notes", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-test-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("appendText", () => {
    it("should append text to existing file", () => {
      const filePath = path.join(tempDir, "test.md");
      fs.writeFileSync(filePath, "Initial content");

      appendText(filePath, "Appended text");

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe("Initial content\nAppended text");
    });

    it("should create new file and append text if file doesn't exist", () => {
      const filePath = path.join(tempDir, "new.md");

      appendText(filePath, "New content");

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe("\nNew content");
    });

    it("should append multiple lines", () => {
      const filePath = path.join(tempDir, "multi.md");
      fs.writeFileSync(filePath, "Line 1");

      appendText(filePath, "Line 2");
      appendText(filePath, "Line 3");

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe("Line 1\nLine 2\nLine 3");
    });

    it("should handle empty content", () => {
      const filePath = path.join(tempDir, "empty.md");
      fs.writeFileSync(filePath, "Content");

      appendText(filePath, "");

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe("Content\n");
    });
  });

  describe("createProperties", () => {
    it("should create YAML frontmatter for single tag", () => {
      const result = createProperties(["todo"]);
      expect(result).toBe('---\ntags: ["todo"]\n---\n');
    });

    it("should create YAML frontmatter for multiple tags", () => {
      const result = createProperties(["todo", "important", "work"]);
      expect(result).toBe('---\ntags: ["todo","important","work"]\n---\n');
    });

    it("should return empty string for empty tags array", () => {
      const result = createProperties([]);
      expect(result).toBe("");
    });

    it("should handle tags with special characters", () => {
      const result = createProperties(["my-tag", "tag_with_underscore", "tag/with/slash"]);
      expect(result).toBe('---\ntags: ["my-tag","tag_with_underscore","tag/with/slash"]\n---\n');
    });

    it("should handle tags with spaces", () => {
      const result = createProperties(["my tag", "another tag"]);
      expect(result).toBe('---\ntags: ["my tag","another tag"]\n---\n');
    });

    it("should handle single tag correctly (no trailing comma)", () => {
      const result = createProperties(["single"]);
      expect(result).toBe('---\ntags: ["single"]\n---\n');
    });
  });

  describe("writeMarkdown", () => {
    it("should create file in existing directory", () => {
      const dirPath = path.join(tempDir, "existing");
      fs.mkdirSync(dirPath);

      writeMarkdown(dirPath, "test", "# Test Content");

      const filePath = path.join(dirPath, "test.md");
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe("# Test Content");
      expect(showToast).toHaveBeenCalledWith({ title: "Note created", style: "success" });
    });

    it("should create directory if it doesn't exist", () => {
      const dirPath = path.join(tempDir, "new", "nested", "folder");

      writeMarkdown(dirPath, "note", "Content");

      const filePath = path.join(dirPath, "note.md");
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe("Content");
    });

    it("should call onDirectoryCreationFailed callback on directory creation failure", () => {
      const invalidPath = "\0invalid";
      const callback = vi.fn();

      writeMarkdown(invalidPath, "test", "content", callback);

      expect(callback).toHaveBeenCalledWith(invalidPath);
      expect(showToast).not.toHaveBeenCalled();
    });

    it("should call onFileWriteFailed callback on file write failure", () => {
      // Create a directory where the file should be (will cause write failure)
      const dirPath = path.join(tempDir, "test-dir");
      fs.mkdirSync(dirPath);
      fs.mkdirSync(path.join(dirPath, "test.md")); // Create directory with same name as file

      const callback = vi.fn();

      writeMarkdown(dirPath, "test", "content", undefined, callback);

      expect(callback).toHaveBeenCalledWith(dirPath, "test");
      expect(showToast).not.toHaveBeenCalled();
    });

    it("should overwrite existing file", () => {
      const dirPath = path.join(tempDir, "overwrite");
      fs.mkdirSync(dirPath);
      const filePath = path.join(dirPath, "test.md");
      fs.writeFileSync(filePath, "Old content");

      writeMarkdown(dirPath, "test", "New content");

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe("New content");
    });

    it("should handle empty content", () => {
      writeMarkdown(tempDir, "empty", "");

      const filePath = path.join(tempDir, "empty.md");
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe("");
    });

    it("should handle content with YAML frontmatter", () => {
      const content = '---\ntags: ["test"]\n---\n# Title';

      writeMarkdown(tempDir, "with-frontmatter", content);

      const filePath = path.join(tempDir, "with-frontmatter.md");
      const readContent = fs.readFileSync(filePath, "utf-8");
      expect(readContent).toBe(content);
    });
  });

  describe("deleteNote", () => {
    it("should delete existing note", () => {
      const notePath = path.join(tempDir, "to-delete.md");
      fs.writeFileSync(notePath, "Content");

      const note: Note = {
        title: "To Delete",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      };

      const result = deleteNote(note);

      expect(result).toBe(true);
      expect(fs.existsSync(notePath)).toBe(false);
    });

    it("should return false for non-existent note", () => {
      const note: Note = {
        title: "Non-existent",
        path: path.join(tempDir, "non-existent.md"),
        lastModified: new Date(),
        bookmarked: false,
      };

      const result = deleteNote(note);

      expect(result).toBe(false);
    });

    it("should handle already deleted file gracefully", () => {
      const notePath = path.join(tempDir, "deleted.md");
      const note: Note = {
        title: "Deleted",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      };

      // Try to delete twice
      const firstResult = deleteNote(note);
      const secondResult = deleteNote(note);

      expect(firstResult).toBe(false);
      expect(secondResult).toBe(false);
    });

    it("should delete note with special characters in filename", () => {
      const notePath = path.join(tempDir, "special-chars!@#.md");
      fs.writeFileSync(notePath, "Content");

      const note: Note = {
        title: "Special Chars",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      };

      const result = deleteNote(note);

      expect(result).toBe(true);
      expect(fs.existsSync(notePath)).toBe(false);
    });

    it("should delete note in nested directory", () => {
      const nestedDir = path.join(tempDir, "nested", "folder");
      fs.mkdirSync(nestedDir, { recursive: true });
      const notePath = path.join(nestedDir, "note.md");
      fs.writeFileSync(notePath, "Content");

      const note: Note = {
        title: "Nested Note",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      };

      const result = deleteNote(note);

      expect(result).toBe(true);
      expect(fs.existsSync(notePath)).toBe(false);
      // Directory should still exist
      expect(fs.existsSync(nestedDir)).toBe(true);
    });
  });

  describe("isNote", () => {
    it("should return true for valid Note object", () => {
      const note: Note = {
        title: "Test",
        path: "/path/to/note.md",
        lastModified: new Date(),
        bookmarked: false,
      };

      expect(isNote(note)).toBe(true);
    });

    it("should return false for undefined", () => {
      expect(isNote(undefined)).toBe(false);
    });

    it("should return true for Note with all required fields", () => {
      const note: Note = {
        title: "Complete Note",
        path: "/complete.md",
        lastModified: new Date("2025-01-01"),
        bookmarked: true,
      };

      expect(isNote(note)).toBe(true);
    });
  });

  describe("integration tests", () => {
    it("should create note with properties and then delete it", () => {
      const tags = ["test", "integration"];
      const properties = createProperties(tags);
      const content = properties + "\n# Integration Test\n\nSome content.";

      writeMarkdown(tempDir, "integration", content);

      const notePath = path.join(tempDir, "integration.md");
      expect(fs.existsSync(notePath)).toBe(true);

      const note: Note = {
        title: "Integration",
        path: notePath,
        lastModified: new Date(),
        bookmarked: false,
      };

      const deleteResult = deleteNote(note);
      expect(deleteResult).toBe(true);
      expect(fs.existsSync(notePath)).toBe(false);
    });

    it("should create note and append text multiple times", () => {
      writeMarkdown(tempDir, "append-test", "Initial content");

      const notePath = path.join(tempDir, "append-test.md");
      appendText(notePath, "First append");
      appendText(notePath, "Second append");

      const content = fs.readFileSync(notePath, "utf-8");
      expect(content).toBe("Initial content\nFirst append\nSecond append");
    });
  });
});
