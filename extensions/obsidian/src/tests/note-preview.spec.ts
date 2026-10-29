import { describe, expect, it } from "vitest";
import { MAX_INLINE_NOTE_CONTENT_SIZE_BYTES, shouldLoadNoteContentForList } from "../api/search/note-preview.service";

describe("note list preview", () => {
  it("does not load full content for a content match", () => {
    expect(shouldLoadNoteContentForList(true, true, 100)).toBe(false);
  });

  it("does not load oversized note content for a title match", () => {
    expect(shouldLoadNoteContentForList(true, false, MAX_INLINE_NOTE_CONTENT_SIZE_BYTES + 1)).toBe(false);
  });

  it("loads a selected small note for the regular detail view", () => {
    expect(shouldLoadNoteContentForList(true, false, MAX_INLINE_NOTE_CONTENT_SIZE_BYTES)).toBe(true);
  });
});
