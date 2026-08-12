import { describe, expect, it } from "vitest";
import { buildObsidianCursorScript } from "../api/open-match/open-match.service";
import { ContentMatch } from "../api/search/content-match.service";

describe("Obsidian match navigation", () => {
  it("builds a script with zero-based editor positions", () => {
    const match: ContentMatch = {
      line: 8,
      column: 4,
      endLine: 8,
      endColumn: 10,
      context: [],
    };

    const script = buildObsidianCursorScript(match);

    expect(script).toContain('{"line":7,"ch":3}');
    expect(script).toContain('{"line":7,"ch":9}');
    expect(script).toContain("editor.setSelection(from, to)");
    expect(script).toContain("editor.scrollIntoView({ from, to }, true)");
  });
});
