import { describe, expect, it } from "vitest";
import { NOTES_PLACEHOLDER, taskMarkdown } from "../markdown";
import type { RitualTask } from "../types";

const base: RitualTask = {
  id: "1",
  title: "Plan the trip",
  evening: false,
  completed: false,
  overdue: false,
};

describe("taskMarkdown", () => {
  // The panel used to go blank for a bare task — no title, no notes, nothing
  // to write into. Every task now names itself and says where its notes would
  // go, which is what makes the empty state legible rather than absent.
  it("always names the task, even with nothing else to show", () => {
    expect(taskMarkdown(base)).toBe(`# Plan the trip\n\n${NOTES_PLACEHOLDER}`);
  });

  it("renders notes under the title", () => {
    expect(taskMarkdown({ ...base, notes: "Pack early" })).toBe(
      "# Plan the trip\n\nPack early",
    );
  });

  // Deliberately NOT a `- [x]` task list: Raycast draws that as a hollow
  // square that reads as an interactive checkbox, and nothing here can tick a
  // subtask. Strikethrough says "done" without promising a control.
  it("strikes through completed subtasks and leaves the rest plain", () => {
    const withChecklist = {
      ...base,
      checklist: [
        { title: "Book flights", done: true },
        { title: "Book hotel", done: false },
      ],
    };
    // The placeholder still appears: subtasks are not notes, and a task with
    // a checklist and no notes still has an empty notes field to fill.
    expect(taskMarkdown(withChecklist)).toBe(
      `# Plan the trip\n\n${NOTES_PLACEHOLDER}\n\n- ~~Book flights~~\n- Book hotel`,
    );
  });

  it("puts notes before the checklist, blank-line separated, when both exist", () => {
    const both = {
      ...base,
      notes: "Pack early",
      checklist: [{ title: "Book flights", done: false }],
    };
    expect(taskMarkdown(both)).toBe(
      "# Plan the trip\n\nPack early\n\n- Book flights",
    );
  });

  it("treats an explicitly empty checklist as no checklist", () => {
    expect(taskMarkdown({ ...base, checklist: [] })).toBe(
      `# Plan the trip\n\n${NOTES_PLACEHOLDER}`,
    );
  });

  it("tolerates a schema-2 row: checklistDone/Total present, no checklist array", () => {
    const schema2 = { ...base, checklistDone: 1, checklistTotal: 2 };
    expect(taskMarkdown(schema2)).toBe(
      `# Plan the trip\n\n${NOTES_PLACEHOLDER}`,
    );
  });

  // Whitespace-only notes are empty notes. Without this the panel prints a
  // blank line under the title and offers nothing to act on — worse than the
  // placeholder, because it looks like the notes failed to load.
  it("treats blank notes as no notes", () => {
    expect(taskMarkdown({ ...base, notes: "   \n\n  " })).toBe(
      `# Plan the trip\n\n${NOTES_PLACEHOLDER}`,
    );
  });

  // Raycast renders the body as markdown, so a `#` in a title would promote
  // the rest of the line to a heading of its own size and a `_` would italicise
  // through it.
  it("escapes markdown punctuation in the title", () => {
    const awkward = { ...base, title: "Read #3 of *Dune* [again]" };
    expect(taskMarkdown(awkward)).toBe(
      `# Read \\#3 of \\*Dune\\* \\[again\\]\n\n${NOTES_PLACEHOLDER}`,
    );
  });
});
