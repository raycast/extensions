import { describe, expect, it } from "vitest";

import { sanitizeMarkdown } from "./sanitize";
import {
  countWords,
  escapeMarkdownLine,
  markdownToPlainText,
  matchesQuery,
  normalizeForSearch,
  splitList,
} from "./text";

describe("normalizeForSearch", () => {
  it("strips Vietnamese diacritics including đ", () => {
    expect(normalizeForSearch("  Truyện Kiều — ĐẶNG  ")).toBe("truyen kieu — dang");
  });

  it("matches every query token regardless of order and accents", () => {
    expect(matchesQuery("Nguyễn Du Truyện Kiều", "kieu nguyen")).toBe(true);
    expect(matchesQuery("Nguyễn Du", "kieu")).toBe(false);
    expect(matchesQuery("anything", "")).toBe(true);
  });
});

describe("countWords", () => {
  it("counts whitespace tokens and CJK characters", () => {
    expect(countWords("hello   world")).toBe(2);
    expect(countWords("日本語 text")).toBe(4);
    expect(countWords("")).toBe(0);
  });
});

describe("escapeMarkdownLine", () => {
  it("neutralizes block syntax at the start of a line", () => {
    expect(escapeMarkdownLine("# not a heading")).toBe("\\# not a heading");
    expect(escapeMarkdownLine("1. not a list")).toBe("1\\. not a list");
    expect(escapeMarkdownLine("    - indented dash")).toBe("\\- indented dash");
    expect(escapeMarkdownLine("plain text")).toBe("plain text");
  });
});

describe("markdownToPlainText", () => {
  it("drops Markdown syntax but keeps link text", () => {
    expect(markdownToPlainText("## Hello *world* [link](https://example.com)")).toBe("Hello world link");
  });
});

describe("splitList", () => {
  it("trims, drops empties, and dedupes", () => {
    expect(splitList("a, b,, a ")).toEqual(["a", "b"]);
  });
});

describe("sanitizeMarkdown", () => {
  it("removes HTML, images, and unsafe links but keeps code fences verbatim", () => {
    const input = [
      "Hello <b>bold</b> ![pixel](https://t.example/p.gif) [x](javascript:alert(1)) [ok](https://example.com)",
      "<!-- tracking comment -->",
      "```html",
      "<div>kept</div>",
      "```",
    ].join("\n");

    expect(sanitizeMarkdown(input)).toBe(
      ["Hello bold  x [ok](https://example.com)", "", "```html", "<div>kept</div>", "```"].join("\n"),
    );
  });
});
