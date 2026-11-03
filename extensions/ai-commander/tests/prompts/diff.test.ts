import { describe, expect, it } from "vitest";
import {
  BRACKET_DIFF_STYLE,
  DEFAULT_DIFF_STYLE,
  STRIKETHROUGH_DIFF_STYLE,
  diffSegments,
  escapeMarkdown,
  renderDiff,
  changeShare,
  renderSegments,
} from "../../src/prompts/diff";

const markdown = (original: string, result: string) => renderDiff(original, result).markdown;

describe("escapeMarkdown", () => {
  it("escapes Markdown syntax", () => {
    expect(escapeMarkdown("# a *b* _c_ `d` [e](f) ~~g~~")).toBe(
      "\\# a \\*b\\* \\_c\\_ \\`d\\` \\[e\\]\\(f\\) \\~\\~g\\~\\~",
    );
    expect(escapeMarkdown("a\\b")).toBe("a\\\\b");
    expect(escapeMarkdown("- item\n1. item\n> quote")).toBe("\\- item  \n1\\. item  \n\\> quote");
  });

  it("keeps single line breaks and blank lines", () => {
    expect(escapeMarkdown("a\nb\n\nc")).toBe("a  \nb\n\nc");
    expect(escapeMarkdown("a\r\nb")).toBe("a  \nb");
  });

  it("prevents indented code blocks", () => {
    expect(escapeMarkdown("    code")).toBe("    code");
  });
});

describe("diffSegments", () => {
  it("merges changes separated by a blank", () => {
    expect(diffSegments("one two three four", "one 2 3 four")).toEqual([
      { type: "equal", text: "one " },
      { type: "change", removed: "two three", added: "2 3" },
      { type: "equal", text: " four" },
    ]);
  });

  it("does not merge across a line break", () => {
    const segments = diffSegments("a\nb", "x\ny");
    expect(segments).toEqual([
      { type: "change", removed: "a", added: "x" },
      { type: "equal", text: "\n" },
      { type: "change", removed: "b", added: "y" },
    ]);
  });

  it("treats punctuation as part of the word", () => {
    expect(diffSegments("end.", "end!")).toEqual([{ type: "change", removed: "end.", added: "end!" }]);
  });

  it("reports only equality for identical text", () => {
    expect(diffSegments("same text", "same text")).toEqual([{ type: "equal", text: "same text" }]);
  });
});

describe("renderDiff", () => {
  it("defaults to the strikethrough style", () => {
    expect(DEFAULT_DIFF_STYLE).toBe(STRIKETHROUGH_DIFF_STYLE);
    expect(markdown("the old word", "the new word")).toBe("the ~~old~~ **new** word");
  });

  it("switches style with a single argument", () => {
    expect(renderDiff("the old word", "the new word", BRACKET_DIFF_STYLE).markdown).toBe("the [-old-] **new** word");
  });

  it("renders merged blocks once", () => {
    expect(markdown("one two three four", "one 2 3 four")).toBe("one ~~two three~~ **2 3** four");
  });

  it("renders pure removals and additions with correct spacing", () => {
    expect(markdown("a foo b", "a b")).toBe("a ~~foo~~ b");
    expect(markdown("a b", "a foo b")).toBe("a **foo** b");
  });

  it("escapes content inside and outside changes", () => {
    expect(markdown("# a*b*", "# a_b_")).toBe("\\# ~~a\\*b\\*~~ **a\\_b\\_**");
  });

  it("keeps delimiters tight around multi-line changes", () => {
    const output = markdown("keep\nold one\nold two\nkeep", "keep\nnew\nkeep");
    expect(output).toContain("~~old one~~");
    expect(output).toContain("~~old two~~");
    expect(output).not.toMatch(/~~\s+~~|~~\n|\n\s*~~\s/);
    expect(output).toContain("**new**");
  });

  it("does not wrap whitespace-only changes", () => {
    expect(markdown("a  b", "a b")).toBe("a b");
    expect(markdown("a\nb", "a\n\nb")).toBe("a\n\nb");
  });

  it("handles empty sides", () => {
    expect(markdown("", "new")).toBe("**new**");
    expect(markdown("old", "")).toBe("~~old~~");
    expect(markdown("", "")).toBe("");
  });

  it("keeps line breaks in unchanged text", () => {
    expect(markdown("a\nb old", "a\nb new")).toBe("a  \nb ~~old~~ **new**");
  });

  it("falls back to plain text on huge input", () => {
    const original = "word ".repeat(100_000);
    const started = performance.now();
    const outcome = renderDiff(original, `${original}# more`);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(outcome.highlighted).toBe(false);
    expect(outcome.markdown).toContain("\\# more");
  });

  it("falls back on large, entirely different text", () => {
    const original = Array.from({ length: 20_000 }, (_, index) => `a${index}`).join(" ");
    const result = Array.from({ length: 20_000 }, (_, index) => `b${index}`).join(" ");
    const started = performance.now();
    expect(renderDiff(original, result).highlighted).toBe(false);
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it("diffs a large text with few changes", () => {
    const original = Array.from({ length: 20_000 }, (_, index) => `w${index}`).join(" ");
    const outcome = renderDiff(original, original.replace("w500 ", "changed "));
    expect(outcome.highlighted).toBe(true);
    expect(outcome.markdown).toContain("~~w500~~ **changed**");
  });
});

describe("changeShare", () => {
  it("measures how much of the result is new", () => {
    expect(changeShare([{ type: "equal", text: "same" }])).toBe(0);
    expect(changeShare([{ type: "change", removed: "old", added: "new text" }])).toBe(1);
    const half = changeShare([
      { type: "equal", text: "keep" },
      { type: "change", removed: "x", added: "news" },
    ]);
    expect(half).toBeCloseTo(0.5);
  });

  it("ignores removed text and handles an empty result", () => {
    expect(changeShare([{ type: "change", removed: "gone", added: "" }])).toBe(0);
    expect(changeShare([])).toBe(0);
  });
});

describe("renderSegments", () => {
  it("renders the same Markdown as a full diff, without diffing again", () => {
    const segments = diffSegments("one two", "one three") ?? [];
    expect(renderSegments(segments)).toBe(renderDiff("one two", "one three").markdown);
  });
});
