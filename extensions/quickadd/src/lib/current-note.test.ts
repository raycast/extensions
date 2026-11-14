import { describe, expect, it } from "vitest";
import { currentFor, headlessCurrentNote, noteItems } from "./current-note";

describe("noteItems", () => {
  it("keeps each note once and drops aliases and attachments", () => {
    const links = [
      { text: "Ada Lovelace", path: "People/Ada Lovelace.md" },
      { text: "Ada", path: "People/Ada Lovelace.md", alias: "Ada" },
      { text: "diagram.png", path: "Assets/diagram.png" },
      { text: "Board.canvas", path: "Board.canvas" },
      { text: "Plan", path: "Plan.md" },
    ];
    expect(noteItems(links).map((item) => item.path)).toEqual([
      "People/Ada Lovelace.md",
      "Plan.md",
    ]);
  });
});

describe("headlessCurrentNote", () => {
  it("refuses a choice that needs a current note", () => {
    expect(() =>
      headlessCurrentNote({ name: "Log to note", currentNote: "required" }),
    ).toThrow(
      /^Log to note needs a current note\. Run it from Run QuickAdd Choice\.$/,
    );
  });

  it("runs a choice that can do without one with no current note", () => {
    expect(
      headlessCurrentNote({ name: "Inbox", currentNote: "optional" }),
    ).toBe("none");
  });

  it("sends none when the choice does not use the current note, so the active tab is never read", () => {
    expect(headlessCurrentNote({ name: "Inbox", currentNote: "none" })).toBe(
      "none",
    );
  });

  it("sends nothing to a QuickAdd that does not report currentNote", () => {
    expect(headlessCurrentNote({ name: "Inbox" })).toBe(undefined);
  });
});

describe("currentFor", () => {
  it("passes the pick through and defaults to none", () => {
    expect(
      currentFor({ name: "A", currentNote: "required" }, "Notes/X.md"),
    ).toBe("Notes/X.md");
    expect(currentFor({ name: "A", currentNote: "none" })).toBe("none");
    expect(currentFor({ name: "A" })).toBe(undefined);
  });
});
