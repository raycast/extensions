import { describe, expect, it } from "vitest";
import {
  confirmCopySamples,
  isMeaningfulSelection,
  quoteText,
  resolveSelectionAfterCopy,
  toRestorableContent,
} from "./quote";

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
  it("uses the new clipboard text when Cmd+C bumped the change count", () => {
    const before = { text: "old", changeCount: 1 };
    const after = { text: "new", changeCount: 2 };
    expect(resolveSelectionAfterCopy(before, after)).toBe("new");
  });

  it("uses the text when the count bumped even if identical (terminal re-copy on Cmd+C)", () => {
    const before = { text: "sel", changeCount: 1 };
    const after = { text: "sel", changeCount: 2 };
    expect(resolveSelectionAfterCopy(before, after)).toBe("sel");
  });

  it("returns whitespace-only text on a bump and lets the caller reject it", () => {
    const before = { text: "token", changeCount: 1 };
    const after = { text: "  ", changeCount: 2 };
    expect(resolveSelectionAfterCopy(before, after)).toBe("  ");
  });

  it("returns null when the count did not change (nothing selected, stale clipboard)", () => {
    const before = { text: "secret", changeCount: 1 };
    const after = { text: "secret", changeCount: 1 };
    expect(resolveSelectionAfterCopy(before, after)).toBeNull();
  });

  it("returns null when both are empty and unchanged", () => {
    const before = { text: "", changeCount: 1 };
    const after = { text: "", changeCount: 1 };
    expect(resolveSelectionAfterCopy(before, after)).toBeNull();
  });

  it("returns null when a bump produced empty text", () => {
    const before = { text: "x", changeCount: 1 };
    const after = { text: "", changeCount: 2 };
    expect(resolveSelectionAfterCopy(before, after)).toBeNull();
  });

  it("returns null when the count moved more than once (concurrent write)", () => {
    const before = { text: "old", changeCount: 1 };
    const after = { text: "other-app", changeCount: 3 };
    expect(resolveSelectionAfterCopy(before, after)).toBeNull();
  });
});

describe("confirmCopySamples", () => {
  it("keeps the text when both Cmd+C probes agree", () => {
    expect(confirmCopySamples("sel", "sel")).toBe("sel");
  });

  it("returns null when the second probe differs (concurrent overwrite)", () => {
    expect(confirmCopySamples("sel", "other-app")).toBeNull();
  });

  it("returns null when either probe failed", () => {
    expect(confirmCopySamples(null, "sel")).toBeNull();
    expect(confirmCopySamples("sel", null)).toBeNull();
    expect(confirmCopySamples(null, null)).toBeNull();
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
