import { describe, expect, it } from "vitest";
import {
  buildSavedResult,
  insertSavedResult,
  normalizeSavedResults,
  savedResultId,
  type SaveResultInput,
} from "../../src/lib/saved-results-model";

const input: SaveResultInput = {
  kind: "expression",
  sourceText: "我想委婉地催一下文件。",
  outputText: "Could you send me the file when you get a chance?",
  coaching: "`Could you` keeps the request polite.",
  markdown:
    "# Expression Coach\n\nCould you send me the file when you get a chance?",
  provider: "qwen",
  providerTitle: "Qwen",
  model: "qwen3.6-flash",
  targetLanguageTitle: "English",
  tone: "Natural",
};

describe("saved results", () => {
  it("normalizes, sorts, and filters stored entries", () => {
    const id = savedResultId(input);
    const normalized = normalizeSavedResults([
      {
        ...input,
        id,
        title: "Older",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      { id: "broken" },
      {
        ...input,
        id: `${id}-new`,
        title: "Newer",
        createdAt: "2026-06-02T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
      },
    ]);

    expect(normalized.map((item) => item.title)).toEqual(["Newer", "Older"]);
  });

  it("builds a current result without duplicating the same content", () => {
    const id = savedResultId(input);
    const existing = normalizeSavedResults([
      {
        ...input,
        id,
        title: "Existing",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);

    const saved = buildSavedResult(input, existing, "2026-06-02T00:00:00.000Z");
    expect(saved.id).toBe(id);
    expect(saved.createdAt).toBe("2026-06-01T00:00:00.000Z");

    const stored = insertSavedResult(saved, existing);
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toContain("Expression:");
    expect(stored[0].updatedAt).toBe("2026-06-02T00:00:00.000Z");
  });
});
