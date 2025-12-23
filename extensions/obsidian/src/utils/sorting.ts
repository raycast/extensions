import { Note } from "@/obsidian";
import fs from "fs";

export type SortOrder =
  | "relevance"
  | "alphabetical-asc"
  | "alphabetical-desc"
  | "modified-desc"
  | "modified-asc"
  | "created-desc"
  | "created-asc";

export function sortNotes(notes: Note[], sortOrder: SortOrder): Note[] {
  const sorted = [...notes];

  switch (sortOrder) {
    case "relevance": // Preserve original order (search relevance)
      return sorted;

    case "alphabetical-asc": // A to Z by filename
      return sorted.sort((a, b) => a.title.localeCompare(b.title));

    case "alphabetical-desc": // Z to A by filename
      return sorted.sort((a, b) => b.title.localeCompare(a.title));

    case "modified-desc": // Modified time (new to old)
      return sorted.sort((a, b) => {
        const timeA = a.lastModified.getTime();
        const timeB = b.lastModified.getTime();
        return timeB - timeA;
      });

    case "modified-asc": // Modified time (old to new)
      return sorted.sort((a, b) => {
        const timeA = a.lastModified.getTime();
        const timeB = b.lastModified.getTime();
        return timeA - timeB;
      });

    case "created-desc": // Created time (new to old)
      return sorted.sort((a, b) => {
        // if a file has been moved we don't want to throw an error here
        try {
          const timeA = fs.existsSync(a.path) ? fs.statSync(a.path).birthtime.getTime() : 0;
          const timeB = fs.existsSync(b.path) ? fs.statSync(b.path).birthtime.getTime() : 0;
          return timeB - timeA;
        } catch {
          return 0;
        }
      });

    case "created-asc": // Created time (old to new)
      return sorted.sort((a, b) => {
        // if a file has been moved we don't want to throw an error here
        try {
          const timeA = fs.existsSync(a.path) ? fs.statSync(a.path).birthtime.getTime() : 0;
          const timeB = fs.existsSync(b.path) ? fs.statSync(b.path).birthtime.getTime() : 0;
          return timeA - timeB;
        } catch {
          return 0;
        }
      });

    default:
      return sorted;
  }
}
