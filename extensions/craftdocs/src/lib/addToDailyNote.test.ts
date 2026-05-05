import { describe, expect, it } from "vitest";
import { resolveAddToDailyNoteAction } from "./addToDailyNote";

describe("resolveAddToDailyNoteAction", () => {
  it("returns submit when required inputs are missing", () => {
    expect(resolveAddToDailyNoteAction({ content: "", spaceId: "", dailyNoteBlockId: null })).toBe("submit");
  });

  it("returns append when the Daily Note block is known", () => {
    expect(resolveAddToDailyNoteAction({ content: "hello", spaceId: "space-1", dailyNoteBlockId: "block-1" })).toBe(
      "append",
    );
  });

  it("returns open-daily-note when content exists but lookup is unavailable", () => {
    expect(resolveAddToDailyNoteAction({ content: "hello", spaceId: "space-1", dailyNoteBlockId: null })).toBe(
      "open-daily-note",
    );
  });
});
