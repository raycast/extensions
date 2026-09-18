import { describe, expect, it } from "vitest";

import { UNKNOWN_LANGUAGE, languageLabel, normalizeLanguageTag } from "./languages";

describe("normalizeLanguageTag", () => {
  it.each([
    ["en-US", "en"],
    ["PT_br", "pt"],
    [" vi ", "vi"],
    ["fil", "fil"],
    [null, UNKNOWN_LANGUAGE],
    [undefined, UNKNOWN_LANGUAGE],
    ["12", UNKNOWN_LANGUAGE],
  ])("%j → %s", (tag, expected) => {
    expect(normalizeLanguageTag(tag)).toBe(expected);
  });
});

describe("languageLabel", () => {
  it("uses known labels and falls back to the uppercase code", () => {
    expect(languageLabel("vi")).toBe("Vietnamese");
    expect(languageLabel("pt")).toBe("PT");
  });
});
