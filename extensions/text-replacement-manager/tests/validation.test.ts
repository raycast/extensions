import { describe, expect, it } from "vitest";

import { applyTagSuggestion, suggestTags, validateReplacementInput } from "../src/lib/validation";
import type { TextReplacement } from "../src/lib/types";

const existing: TextReplacement[] = [
  {
    uuid: "existing-1",
    trigger: "omw",
    replacementText: "On my way!",
    tags: ["default"],
    enabled: true,
  },
];

describe("validateReplacementInput", () => {
  it("accepts a unique non-whitespace trigger and replacement text", () => {
    expect(
      validateReplacementInput(
        { trigger: "brb", replacementText: "Be right back", tags: ["chat"] },
        existing,
      ),
    ).toEqual({});
  });

  it("rejects invalid, duplicate, and empty values", () => {
    expect(validateReplacementInput({ trigger: "two words", replacementText: " ", tags: [] }, existing)).toEqual({
      trigger: "Trigger must be 1-64 non-whitespace characters.",
      replacementText: "Replacement text is required.",
    });

    expect(validateReplacementInput({ trigger: "omw", replacementText: "On my way", tags: [] }, existing)).toEqual({
      trigger: "Trigger must be unique.",
    });
  });

  it("allows an unchanged trigger when editing the same replacement", () => {
    expect(
      validateReplacementInput({ trigger: "omw", replacementText: "On my way", tags: [] }, existing, "existing-1"),
    ).toEqual({});
  });
});

describe("tag suggestions", () => {
  it("suggests existing tags for the active comma-separated token", () => {
    expect(suggestTags("personal, tr", ["travel", "work", "transit", "personal"])).toEqual(["transit", "travel"]);
  });

  it("applies a suggestion to the active token", () => {
    expect(applyTagSuggestion("personal, tr", "travel")).toBe("personal, travel");
  });
});
