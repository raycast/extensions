import { describe, expect, it } from "vitest";
import { buildPinnedItems } from "../../src/lib/pinned-expressions-model";
import type { SavedResult } from "../../src/lib/saved-results-model";

function saved(overrides: Partial<SavedResult> = {}): SavedResult {
  return {
    id: "id-1",
    kind: "expression",
    title: "Expression",
    sourceText: "催一下文件。",
    outputText: "Could you send me the file when you get a chance?",
    coaching: "- keep it polite",
    markdown: "# x",
    provider: "qwen",
    model: "qwen3.6-flash",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildPinnedItems", () => {
  it("returns nothing for an empty list", () => {
    expect(buildPinnedItems([])).toEqual([]);
  });

  it("maps each saved result to its expression plus floating-note context", () => {
    expect(buildPinnedItems([saved()])).toEqual([
      {
        id: "id-1",
        primary: "Could you send me the file when you get a chance?",
        source: "催一下文件。",
        coaching: "- keep it polite",
      },
    ]);
  });

  it("labels analysis results by their source sentence", () => {
    const [item] = buildPinnedItems([
      saved({
        kind: "analysis",
        sourceText: "Hello there.",
        outputText: undefined,
      }),
    ]);
    expect(item.primary).toBe("Hello there.");
  });

  it("caps the list at the limit (default 10) and preserves order", () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      saved({ id: `id-${i}`, outputText: `expr ${i}` }),
    );
    const items = buildPinnedItems(many);
    expect(items).toHaveLength(10);
    expect(items[0].id).toBe("id-0");
    expect(items[9].id).toBe("id-9");
  });

  it("honours an explicit limit", () => {
    const many = Array.from({ length: 5 }, (_, i) => saved({ id: `id-${i}` }));
    expect(buildPinnedItems(many, 2)).toHaveLength(2);
  });
});
