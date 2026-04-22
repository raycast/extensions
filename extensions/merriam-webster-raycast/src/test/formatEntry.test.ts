import { describe, expect, it } from "vitest";
import { formatEntryMarkdown, formatEntryPlainText } from "../lib/formatEntry";
import type { EntryResult } from "../types";

function makeEntry(overrides: Partial<EntryResult> = {}): EntryResult {
  return {
    kind: "entry",
    id: "book:1",
    headword: "book",
    partOfSpeech: "noun",
    pronunciation: "ˈbu̇k",
    audioUrl: "https://media.merriam-webster.com/audio/prons/en/us/mp3/b/book0001.mp3",
    shortDefinitions: ["a set of printed sheets of paper that are held together inside a cover"],
    examples: ["She borrowed a book from the library."],
    ...overrides,
  };
}

describe("formatEntryMarkdown", () => {
  it("renders a readable detail block for Raycast", () => {
    const entry = makeEntry();
    const markdown = formatEntryMarkdown(entry);

    expect(markdown).toBe(
      [
        "# book",
        "**Part of speech:** noun",
        "**Pronunciation:** ˈbu̇k",
        "",
        "## Definitions",
        "1. a set of printed sheets of paper that are held together inside a cover",
        "",
        "## Examples",
        "- She borrowed a book from the library.",
      ].join("\n"),
    );
  });

  it("omits empty definition sections for sparse entries", () => {
    const markdown = formatEntryMarkdown(
      makeEntry({
        partOfSpeech: undefined,
        pronunciation: undefined,
        shortDefinitions: [],
        examples: [],
      }),
    );

    expect(markdown).toBe("# book");
    expect(markdown).not.toContain("## Definitions");
    expect(markdown).not.toContain("## Examples");
    expect(markdown).not.toContain("Part of speech");
    expect(markdown).not.toContain("Pronunciation");
  });

  it("formats examples without requiring definitions", () => {
    const markdown = formatEntryMarkdown(
      makeEntry({
        shortDefinitions: [],
        examples: ["A sample sentence."],
      }),
    );

    expect(markdown).toBe(
      [
        "# book",
        "**Part of speech:** noun",
        "**Pronunciation:** ˈbu̇k",
        "",
        "## Examples",
        "- A sample sentence.",
      ].join("\n"),
    );
  });
});

describe("formatEntryPlainText", () => {
  it("creates copy-friendly definition text", () => {
    expect(formatEntryPlainText(makeEntry())).toBe(
      [
        "book (noun)",
        "1. a set of printed sheets of paper that are held together inside a cover",
        "Examples:",
        "- She borrowed a book from the library.",
      ].join("\n"),
    );
  });

  it("handles missing part of speech, pronunciation, and examples", () => {
    expect(
      formatEntryPlainText(
        makeEntry({
          partOfSpeech: undefined,
          pronunciation: undefined,
          examples: [],
        }),
      ),
    ).toBe(["book", "1. a set of printed sheets of paper that are held together inside a cover"].join("\n"));
  });

  it("handles empty short definitions without emitting blank payload sections", () => {
    expect(
      formatEntryPlainText(
        makeEntry({
          shortDefinitions: [],
          examples: ["A sample sentence."],
        }),
      ),
    ).toBe(["book (noun)", "Examples:", "- A sample sentence."].join("\n"));
  });
});
