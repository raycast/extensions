import { describe, expect, test } from "bun:test";
import { clipboardMarkdown, displaySource, previewMarkdown, titleFromClipboard } from "../src/lib/format";

describe("titleFromClipboard", () => {
  test("uses the first non-empty line and removes lightweight Markdown", () => {
    expect(titleFromClipboard("\n# Launch checklist\n\n- Ship it")).toBe("Launch checklist");
  });

  test("turns a lone URL into a useful local capture title", () => {
    expect(titleFromClipboard("https://www.example.com/article?q=1")).toBe("Saved link · example.com");
  });

  test("caps titles without cutting into an extra character", () => {
    const title = titleFromClipboard("A".repeat(120));
    expect(title.length).toBe(80);
    expect(title.endsWith("…")).toBe(true);
  });

  test("does not split a Unicode code point at the title boundary", () => {
    const title = titleFromClipboard("😀".repeat(100));
    expect([...title]).toHaveLength(80);
    expect(title.endsWith("…")).toBe(true);
  });

  test("keeps Unicode text and Markdown punctuation intact when it fits", () => {
    expect(titleFromClipboard("  > 日本語のメモ — déjà vu 🚀  ")).toBe("日本語のメモ — déjà vu 🚀");
  });

  test("removes common Markdown wrappers without losing the title text", () => {
    expect(titleFromClipboard("- [x] **Read** [the résumé](https://example.com) `today`")).toBe(
      "Read the résumé today",
    );
  });

  test("uses the supplied time for whitespace-only clipboard content", () => {
    const now = new Date("2026-08-02T12:34:00.000Z");
    const expectedDate = new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);

    expect(titleFromClipboard("\r\n\t  ", now)).toBe(`Clipboard ${expectedDate}`);
  });
});

test("clipboardMarkdown preserves clipboard whitespace and adds at most one final newline", () => {
  expect(clipboardMarkdown("")).toBe("\n");
  expect(clipboardMarkdown("  indented\n\n")).toBe("  indented\n\n");
  expect(clipboardMarkdown("  indented  ")).toBe("  indented  \n");
});

test("previewMarkdown marks a truncated preview", () => {
  expect(previewMarkdown("abcdef", 3)).toContain("Continue reading");
});

test("leaves empty Markdown previews empty", () => {
  expect(previewMarkdown("")).toBe("");
});

test("displaySource humanizes stored source identifiers", () => {
  expect(displaySource("quick_capture")).toBe("Quick Capture");
  expect(displaySource("")).toBe("");
});
