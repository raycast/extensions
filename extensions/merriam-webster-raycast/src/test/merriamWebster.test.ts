import { describe, expect, it } from "vitest";
import {
  buildAudioUrl,
  buildLearnerBrowseUrl,
  normalizeLearnerResponse,
  normalizeLookupTerm,
  shouldSearchTerm,
} from "../api/merriamWebster";
import { audioSubdirectory } from "../lib/audio";
import { learnerEntryResponse, learnerSuggestionResponse } from "./fixtures/learnerEntry";

describe("normalizeLearnerResponse", () => {
  it("maps entry objects into normalized entry results", () => {
    const results = normalizeLearnerResponse(learnerEntryResponse);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      kind: "entry",
      headword: "book",
      partOfSpeech: "noun",
      pronunciation: "ˈbu̇k",
      shortDefinitions: ["a set of printed sheets of paper that are held together inside a cover"],
      examples: ["She borrowed a book from the library."],
    });
  });

  it("maps string arrays into suggestion results", () => {
    expect(normalizeLearnerResponse(learnerSuggestionResponse)).toEqual([
      { kind: "suggestion", value: "books" },
      { kind: "suggestion", value: "booklet" },
      { kind: "suggestion", value: "booking" },
    ]);
  });

  it("returns no results for invalid non-string arrays", () => {
    expect(
      normalizeLearnerResponse([
        { meta: { id: "book:1" } },
        42,
      ]),
    ).toEqual([]);
  });
});

describe("URL helpers", () => {
  it("trims lookup arguments before requesting the API", () => {
    expect(normalizeLookupTerm("  book  ")).toBe("book");
  });

  it("builds a learner browse URL from a headword", () => {
    expect(buildLearnerBrowseUrl("book")).toBe("https://www.merriam-webster.com/dictionary/book");
  });

  it("builds a pronunciation URL for supported audio ids", () => {
    expect(buildAudioUrl("book0001")).toBe("https://media.merriam-webster.com/audio/prons/en/us/mp3/b/book0001.mp3");
  });

  it("requires non-empty trimmed search text", () => {
    expect(shouldSearchTerm("")).toBe(false);
    expect(shouldSearchTerm("   ")).toBe(false);
    expect(shouldSearchTerm("book")).toBe(true);
  });
});

describe("audioSubdirectory", () => {
  it("uses the bix branch for bix-prefixed ids", () => {
    expect(audioSubdirectory("bix1234")).toBe("bix");
  });

  it("uses the gg branch for gg-prefixed ids", () => {
    expect(audioSubdirectory("gg0001")).toBe("gg");
  });

  it("uses the number branch for numeric ids", () => {
    expect(audioSubdirectory("123abc")).toBe("number");
  });

  it("uses the first letter branch for default ids", () => {
    expect(audioSubdirectory("book0001")).toBe("b");
  });
});
