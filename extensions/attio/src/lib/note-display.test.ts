import { describe, expect, it } from "vitest";
import type { Note } from "../api/types";
import { noteListTitle } from "./note-display";

const note = (title: string | null, plaintext: string): Note =>
  ({
    id: { workspace_id: "w", note_id: "n" },
    parent_object: "people",
    parent_record_id: "r",
    title,
    meeting_id: null,
    content_plaintext: plaintext,
    content_markdown: plaintext,
    tags: [],
    created_by_actor: { id: null, type: "system" },
    created_at: "2026-01-01T00:00:00Z",
  }) as unknown as Note;

describe("noteListTitle — no blank rows, ever (spec §8.5)", () => {
  it("uses the title when present", () => expect(noteListTitle(note("Role", "body"))).toBe("Role"));
  it("falls back to the first non-empty content line", () =>
    expect(noteListTitle(note("", "  \nIntro from Dana, warm\nmore"))).toBe("Intro from Dana, warm"));
  it("truncates long first lines at 60 chars with ellipsis", () => {
    const long = "x".repeat(80);
    expect(noteListTitle(note(null, long))).toBe("x".repeat(60) + "…");
  });
  it("empty title AND empty content → Untitled note", () =>
    expect(noteListTitle(note("", "   "))).toBe("Untitled note"));
});
