import type { Keyboard } from "@raycast/api";

/** Vim-style reader shortcuts. Raycast requires a modifier; see ADR-0003. */
export type ReaderKey =
  | "nextPage"
  | "previousPage"
  | "forwardPages"
  | "backPages"
  | "nextChapter"
  | "previousChapter"
  | "jumpBack"
  | "toggleBookmark"
  | "commandMode"
  | "search";

export const READER_KEYS: Record<ReaderKey, Keyboard.Shortcut> = {
  nextPage: { modifiers: ["ctrl"], key: "j" },
  previousPage: { modifiers: ["ctrl"], key: "k" },
  forwardPages: { modifiers: ["ctrl"], key: "d" },
  backPages: { modifiers: ["ctrl"], key: "u" },
  nextChapter: { modifiers: ["ctrl"], key: "l" },
  previousChapter: { modifiers: ["ctrl"], key: "h" },
  jumpBack: { modifiers: ["ctrl"], key: "o" },
  toggleBookmark: { modifiers: ["ctrl"], key: "m" },
  commandMode: { modifiers: ["ctrl"], key: ";" },
  search: { modifiers: ["ctrl"], key: "/" },
};

export type LibraryKey = "importBook" | "editMetadata" | "refresh" | "showInFinder";

export const LIBRARY_KEYS: Record<LibraryKey, Keyboard.Shortcut> = {
  importBook: { modifiers: ["cmd"], key: "n" },
  editMetadata: { modifiers: ["cmd"], key: "e" },
  refresh: { modifiers: ["cmd"], key: "r" },
  showInFinder: { modifiers: ["cmd", "shift"], key: "f" },
};
