import { describe, expect, it } from "vitest";
import { isMeaningfulSelection, quoteText, resolveSelectionAfterCopy, toRestorableContent } from "./quote";

describe("quoteText", () => {
  it("prefixes a single line and appends a trailing newline", () => {
    expect(quoteText("hello")).toBe("> hello\n");
  });

  it("prefixes every line of multi-line text", () => {
    expect(quoteText("a\nb")).toBe("> a\n> b\n");
  });

  it("preserves internal blank lines as quoted empty lines", () => {
    expect(quoteText("a\n\nb")).toBe("> a\n> \n> b\n");
  });

  it("strips trailing newlines before quoting", () => {
    expect(quoteText("a\n\n\n")).toBe("> a\n");
  });

  it("returns empty string for empty input", () => {
    expect(quoteText("")).toBe("");
  });

  it("returns empty string when input is only newlines", () => {
    expect(quoteText("\n\n")).toBe("");
  });

  it("nests already-quoted lines", () => {
    expect(quoteText("> foo")).toBe("> > foo\n");
  });

  it("normalizes CRLF and bare CR to LF before quoting", () => {
    expect(quoteText("a\r\nb")).toBe("> a\n> b\n");
    expect(quoteText("a\rb")).toBe("> a\n> b\n");
  });
});

describe("resolveSelectionAfterCopy", () => {
  it("returns null when the clipboard is empty after copy", () => {
    expect(resolveSelectionAfterCopy("x", "")).toBeNull();
  });

  it("uses the unchanged non-empty clipboard (terminal auto-copy)", () => {
    expect(resolveSelectionAfterCopy("sel", "sel")).toBe("sel");
  });

  it("returns null when original and after are both empty", () => {
    expect(resolveSelectionAfterCopy("", "")).toBeNull();
  });

  it("uses the new clipboard content when copy changed it", () => {
    expect(resolveSelectionAfterCopy("old", "new")).toBe("new");
  });

  it("uses the new content when the original clipboard was empty", () => {
    expect(resolveSelectionAfterCopy("", "new")).toBe("new");
  });
});

describe("toRestorableContent", () => {
  it("restores plain text as a string", () => {
    expect(toRestorableContent({ text: "hello" })).toBe("hello");
  });

  it("restores empty clipboard as an empty string", () => {
    expect(toRestorableContent({ text: "" })).toBe("");
  });

  it("restores a file clipboard as file content", () => {
    expect(toRestorableContent({ text: "report.pdf", file: "/tmp/report.pdf" })).toEqual({ file: "/tmp/report.pdf" });
  });

  it("restores rich HTML with its text fallback", () => {
    expect(toRestorableContent({ text: "bold", html: "<b>bold</b>" })).toEqual({ html: "<b>bold</b>", text: "bold" });
  });

  it("prefers file over html when both are present", () => {
    expect(
      toRestorableContent({
        text: "report.pdf",
        file: "/tmp/report.pdf",
        html: "<a>report.pdf</a>",
      }),
    ).toEqual({ file: "/tmp/report.pdf" });
  });
});

describe("isMeaningfulSelection", () => {
  it("rejects empty and whitespace-only text", () => {
    expect(isMeaningfulSelection("")).toBe(false);
    expect(isMeaningfulSelection("   ")).toBe(false);
    expect(isMeaningfulSelection("\n\t  \n")).toBe(false);
  });

  it("accepts text with non-whitespace content", () => {
    expect(isMeaningfulSelection("a")).toBe(true);
    expect(isMeaningfulSelection("  a  ")).toBe(true);
    expect(isMeaningfulSelection("\nhello\n")).toBe(true);
  });
});
