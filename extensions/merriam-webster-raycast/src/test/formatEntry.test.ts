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
    senses: [
      {
        number: "1",
        parts: [
          {
            text: "a set of printed sheets of paper that are held together inside a cover",
            examples: ["She borrowed a book from the library."],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("formatEntryMarkdown", () => {
  it("renders a readable detail block for Raycast", () => {
    const entry = makeEntry();
    const markdown = formatEntryMarkdown(entry);

    expect(markdown).toBe(
      [
        "# book — noun",
        "**Pronunciation:** ˈbu̇k",
        "",
        "1. a set of printed sheets of paper that are held together inside a cover",
        "   - She borrowed a book from the library.",
      ].join("\n"),
    );
  });

  it("omits empty sections for sparse entries", () => {
    const markdown = formatEntryMarkdown(
      makeEntry({
        partOfSpeech: undefined,
        pronunciation: undefined,
        audioUrl: undefined,
        senses: [],
      }),
    );

    expect(markdown).toBe("# book");
    expect(markdown).not.toContain("Pronunciation");
  });

  it("renders multi-part senses with sub-definitions", () => {
    const markdown = formatEntryMarkdown(
      makeEntry({
        senses: [
          {
            number: "1",
            parts: [
              { text: "used to describe something", examples: ["a conditional sale"] },
              { text: "often + on or upon", examples: ["Our agreement is conditional on your support."] },
            ],
          },
          {
            number: "2",
            label: "grammar",
            parts: [
              { text: "showing or used to show something", examples: ['"If she speaks" is a conditional sentence.'] },
            ],
          },
        ],
      }),
    );

    expect(markdown).toContain("1. used to describe something");
    expect(markdown).toContain("   - a conditional sale");
    expect(markdown).toContain("   often + on or upon");
    expect(markdown).toContain("   - Our agreement is conditional on your support.");
    expect(markdown).toContain("2. *grammar* showing or used to show something");
    expect(markdown).toContain('   - "If she speaks" is a conditional sentence.');
  });
});

describe("formatEntryPlainText", () => {
  it("creates copy-friendly definition text", () => {
    expect(formatEntryPlainText(makeEntry())).toBe(
      ["book (noun)", "1. a set of printed sheets of paper that are held together inside a cover", "  - She borrowed a book from the library."].join("\n"),
    );
  });

  it("handles missing part of speech and pronunciation", () => {
    expect(
      formatEntryPlainText(
        makeEntry({
          partOfSpeech: undefined,
          pronunciation: undefined,
          senses: [
            {
              number: "1",
              parts: [{ text: "a definition", examples: [] }],
            },
          ],
        }),
      ),
    ).toBe(["book", "1. a definition"].join("\n"));
  });

  it("handles entries with no senses", () => {
    expect(
      formatEntryPlainText(
        makeEntry({
          senses: [],
        }),
      ),
    ).toBe("book (noun)");
  });
});
