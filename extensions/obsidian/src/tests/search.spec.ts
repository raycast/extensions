import { NoteWithContent } from "@/obsidian";
import { describe, it, expect, beforeEach } from "vitest";
import { filterNotesFuzzy } from "../api/search/search.service";

describe("search", () => {
  describe("filterNotesFuzzy", () => {
    let testNotes: NoteWithContent[];

    beforeEach(() => {
      // Create test notes for each test
      testNotes = [
        {
          title: "Meeting Notes",
          path: "work/meetings/2025-05-15.md",
          content: "Discussion about the new project roadmap",
          lastModified: new Date("2025-05-15"),
          bookmarked: false,
        },
        {
          title: "Project Ideas",
          path: "personal/ideas/projects.md",
          content: "List of potential side projects to work on",
          lastModified: new Date("2025-04-20"),
          bookmarked: true,
        },
        {
          title: "Shopping List",
          path: "personal/lists/shopping.md",
          content: "Groceries and household items to buy",
          lastModified: new Date("2025-05-10"),
          bookmarked: false,
        },
        {
          title: "Programming Notes",
          path: "work/development/programming.md",
          content: "JavaScript and TypeScript tips and tricks",
          lastModified: new Date("2025-03-25"),
          bookmarked: true,
        },
        {
          title: "Travel Plans",
          path: "personal/travel/summer2025.md",
          content: "Itinerary for summer vacation in Italy",
          lastModified: new Date("2025-02-15"),
          bookmarked: false,
        },
      ];
    });

    it("should return all notes when input is empty", () => {
      const result = filterNotesFuzzy(testNotes, "");
      expect(result).toEqual(testNotes);
      expect(result.length).toBe(5);
    });

    it("should filter notes by title", () => {
      const result = filterNotesFuzzy(testNotes, "project");
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((note) => note.title === "Project Ideas")).toBe(true);
    });

    it("should filter notes by path", () => {
      const result = filterNotesFuzzy(testNotes, "personal");
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((note) => note.path.includes("personal"))).toBe(true);
    });

    it("should not search content when byContent is false", () => {
      // Use a unique term that only appears in content
      const result = filterNotesFuzzy(testNotes, "itinerary");
      expect(result.length).toBe(0);
    });

    it("should handle fuzzy matching", () => {
      const result = filterNotesFuzzy(testNotes, "progrmi");
      // Just check if any results contain "Programming" in the title
      const hasMatchingNote = result.some((note) => note.title.includes("Programming"));
      expect(hasMatchingNote).toBe(true);
    });

    it("should handle multiple word search", () => {
      const result = filterNotesFuzzy(testNotes, "personal list");
      // Check if any results match both criteria
      expect(result.some((note) => note.path.includes("personal") && note.title.includes("List"))).toBe(true);
    });

    it("should find notes with title containing 'notes'", () => {
      // Add a note with "notes" in the path but not in the title
      testNotes.push({
        title: "Random Document",
        path: "personal/notes/random.md",
        content: "Some random content",
        lastModified: new Date("2025-01-10"),
        bookmarked: false,
      });

      const result = filterNotesFuzzy(testNotes, "notes");

      // Check if notes with "Notes" in the title are found
      expect(result.some((note) => note.title.includes("Notes"))).toBe(true);
      // Check if the note with "notes" in the path is found
      expect(result.some((note) => note.path.includes("notes"))).toBe(true);
    });

    it("should handle case insensitive search", () => {
      const result = filterNotesFuzzy(testNotes, "PROJECT");
      expect(result.some((note) => note.title.toLowerCase().includes("project"))).toBe(true);
    });

    it("should handle partial word matches", () => {
      const result = filterNotesFuzzy(testNotes, "prog");
      expect(result.some((note) => note.title.includes("Programming"))).toBe(true);
    });
  });
});
