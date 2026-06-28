import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { createTempVault } from "./helpers/createTemporaryVault";
import { ObsidianVault, Note } from "@/obsidian";
import {
  getBookmarksJson,
  getAllBookmarkFiles,
  getBookmarkedNotePaths,
  bookmarkNote,
  unbookmarkNote,
} from "@/obsidian/internal/bookmarks";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({
    configFileName: ".obsidian",
  }),
}));

describe("bookmarks", () => {
  let tempVault: ObsidianVault;
  let cleanup: () => void;
  let paths: Record<string, string>;

  beforeEach(() => {
    const result = createTempVault({ withBookmarks: true });
    tempVault = result.vault;
    cleanup = result.cleanup;
    paths = result.paths;
  });

  afterEach(() => {
    cleanup();
  });

  describe("getBookmarksJson", () => {
    it("should return the bookmarks JSON object", () => {
      const bookmarks = getBookmarksJson(tempVault.path);

      expect(bookmarks).toBeDefined();
      expect(bookmarks?.items).toHaveLength(2);
      expect(bookmarks?.items[0].type).toBe("file");
      expect(bookmarks?.items[1].type).toBe("group");
    });

    it("should return undefined when bookmarks.json doesn't exist", () => {
      // Create a vault without bookmarks
      cleanup();
      const result = createTempVault({ withBookmarks: false });
      tempVault = result.vault;
      cleanup = result.cleanup;
      paths = result.paths;

      const bookmarks = getBookmarksJson(tempVault.path);
      expect(bookmarks).toBeUndefined();
    });
  });

  describe("getAllBookmarkFiles", () => {
    it("should return all bookmarked files flattened", () => {
      const bookmarkFiles = getAllBookmarkFiles(tempVault.path);

      expect(bookmarkFiles).toHaveLength(2);
      expect(bookmarkFiles[0].path).toBe("note1.md");
      expect(bookmarkFiles[1].path).toBe("Folder1/note2.md");
    });

    it("should return empty array when no bookmarks.json exists", () => {
      // Create a vault without bookmarks
      cleanup();
      const result = createTempVault({ withBookmarks: false });
      tempVault = result.vault;
      cleanup = result.cleanup;

      const bookmarkFiles = getAllBookmarkFiles(tempVault.path);
      expect(bookmarkFiles).toEqual([]);
    });
  });

  describe("getBookmarkedNotePaths", () => {
    it("should return paths of all bookmarked notes", () => {
      const notePaths = getBookmarkedNotePaths(tempVault.path);

      expect(notePaths).toHaveLength(2);
      expect(notePaths).toContain("note1.md");
      expect(notePaths).toContain("Folder1/note2.md");
    });
  });

  describe("bookmarkNote", () => {
    it("should add a new note to bookmarks", () => {
      // Create a new note
      const newNotePath = path.join(tempVault.path, "new-note.md");
      fs.writeFileSync(newNotePath, "# New Note\nContent");

      const newNote: Note = {
        path: newNotePath,
        title: "New Note",
        lastModified: new Date(),
        bookmarked: false,
      };

      bookmarkNote(tempVault.path, newNote);

      // Verify the note was added to bookmarks
      const bookmarks = getBookmarksJson(tempVault.path);
      const allFiles = getAllBookmarkFiles(tempVault.path);

      expect(allFiles).toHaveLength(3);
      expect(allFiles.some((file) => file.path === "new-note.md")).toBeTruthy();
      expect(bookmarks?.items).toHaveLength(3);
    });

    it("should not add a note that's already bookmarked", () => {
      const existingNote: Note = {
        path: paths.note1Path,
        title: "Note 1",
        lastModified: new Date(),
        bookmarked: false,
      };

      bookmarkNote(tempVault.path, existingNote);

      // Verify no duplicate was added
      const bookmarks = getBookmarksJson(tempVault.path);
      const allFiles = getAllBookmarkFiles(tempVault.path);

      expect(allFiles).toHaveLength(2);
      expect(bookmarks?.items).toHaveLength(2);
    });

    it("should create bookmarks.json if it doesn't exist", () => {
      // Create a vault without bookmarks
      cleanup();
      const result = createTempVault({ withBookmarks: false });
      tempVault = result.vault;
      cleanup = result.cleanup;
      paths = result.paths;

      const newNote: Note = {
        path: paths.note1Path,
        title: "Note 1",
        lastModified: new Date(),
        bookmarked: false,
      };

      bookmarkNote(tempVault.path, newNote);

      // Verify a new bookmarks.json was created with the note
      expect(fs.existsSync(path.join(tempVault.path, ".obsidian", "bookmarks.json"))).toBeTruthy();

      const bookmarks = getBookmarksJson(tempVault.path);
      expect(bookmarks?.items).toHaveLength(1);
      // expect(bookmarks?.items[0].path).toBe("note1.md");
    });
  });

  describe("unbookmarkNote", () => {
    it("should remove a note from root level bookmarks", () => {
      const note: Note = {
        path: paths.note1Path,
        title: "Note 1",
        lastModified: new Date(),
        bookmarked: false,
      };

      unbookmarkNote(tempVault.path, note);

      // Verify the note was removed
      const bookmarks = getBookmarksJson(tempVault.path);
      const allFiles = getAllBookmarkFiles(tempVault.path);

      expect(allFiles).toHaveLength(1);
      expect(allFiles[0].path).toBe("Folder1/note2.md");
      expect(bookmarks?.items[0].type).toBe("group");
    });

    it("should remove a note from a group", () => {
      const note: Note = {
        path: paths.note2Path,
        title: "Note 2",
        lastModified: new Date(),
        bookmarked: false,
      };

      unbookmarkNote(tempVault.path, note);

      // Verify the note was removed from the group
      const bookmarks = getBookmarksJson(tempVault.path);
      const allFiles = getAllBookmarkFiles(tempVault.path);

      expect(allFiles).toHaveLength(1);
      expect(allFiles[0].path).toBe("note1.md");
      expect(bookmarks?.items[1].type).toBe("group");
      // expect(bookmarks?.items[1].items).toHaveLength(0);
    });

    it("should do nothing if the note is not bookmarked", () => {
      const newNotePath = path.join(tempVault.path, "non-bookmarked.md");
      fs.writeFileSync(newNotePath, "# Non Bookmarked\nContent");

      const note: Note = {
        path: newNotePath,
        title: "Non Bookmarked",
        lastModified: new Date(),
        bookmarked: false,
      };

      unbookmarkNote(tempVault.path, note);

      // Verify nothing changed
      const bookmarks = getBookmarksJson(tempVault.path);
      const allFiles = getAllBookmarkFiles(tempVault.path);

      expect(allFiles).toHaveLength(2);
      expect(bookmarks?.items).toHaveLength(2);
    });

    it("should do nothing if bookmarks.json doesn't exist", () => {
      // Create a vault without bookmarks
      cleanup();
      const result = createTempVault({ withBookmarks: false });
      tempVault = result.vault;
      cleanup = result.cleanup;
      paths = result.paths;

      const note: Note = {
        path: paths.note1Path,
        title: "Note 1",
        lastModified: new Date(),
        bookmarked: false,
      };

      // This should not throw an error
      unbookmarkNote(tempVault.path, note);

      // Verify bookmarks.json still doesn't exist
      expect(fs.existsSync(path.join(tempVault.path, ".obsidian", "bookmarks.json"))).toBeFalsy();
    });
  });
});
