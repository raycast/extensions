import { describe, expect, it } from "vitest";
import {
  displayAddress,
  looksLikeSecret,
  mimeTypeFor,
  parseRecipients,
  plainTextToMarkdown,
  subjectFromText,
} from "./text";

describe("subjectFromText", () => {
  it("takes the first non-empty line, collapsed", () => {
    expect(subjectFromText("\n\n  Buy   milk \nand eggs")).toBe("Buy milk");
  });

  it("trims to 80 characters", () => {
    const subject = subjectFromText("x".repeat(200));
    expect(Array.from(subject)).toHaveLength(80);
    expect(subject.endsWith("…")).toBe(true);
  });

  it("counts characters, not UTF-16 units", () => {
    const subject = subjectFromText("😀".repeat(100));
    expect(Array.from(subject)).toHaveLength(80);
  });

  it("falls back for whitespace-only text", () => {
    expect(subjectFromText("   \n ")).toBe("Note to self");
  });
});

describe("parseRecipients", () => {
  it("accepts commas, semicolons, newlines and display names", () => {
    expect(parseRecipients("a@b.co, Ada <ada@x.io>; c@d.ee\n")).toEqual({
      valid: ["a@b.co", "ada@x.io", "c@d.ee"],
      invalid: [],
    });
  });

  it("reports what isn't an address", () => {
    expect(parseRecipients("a@b.co, nope")).toEqual({ valid: ["a@b.co"], invalid: ["nope"] });
  });
});

describe("plainTextToMarkdown", () => {
  it("escapes markup so text renders as text", () => {
    expect(plainTextToMarkdown("<b>hi</b> *x* [a](b)")).toBe("\\<b\\>hi\\</b\\> \\*x\\* \\[a\\]\\(b\\)");
  });

  it("keeps line breaks", () => {
    expect(plainTextToMarkdown("one\r\ntwo")).toBe("one  \ntwo");
  });
});

describe("displayAddress", () => {
  it("prefers the name", () => {
    expect(displayAddress({ email: "a@b.c", name: "Ada" })).toBe("Ada");
    expect(displayAddress({ email: "a@b.c", name: " " })).toBe("a@b.c");
    expect(displayAddress(null)).toBe("Unknown sender");
  });
});

describe("mimeTypeFor", () => {
  it("maps common extensions and falls back to octet-stream", () => {
    expect(mimeTypeFor("/tmp/Report.PDF")).toBe("application/pdf");
    expect(mimeTypeFor("photo.jpeg")).toBe("image/jpeg");
    expect(mimeTypeFor("archive.unknownext")).toBe("application/octet-stream");
    expect(mimeTypeFor("noext")).toBe("application/octet-stream");
  });
});

describe("looksLikeSecret", () => {
  it.each(["739201", "4KX-9QM", "hunter2hunter2", "  Tr0ub4dor&3  "])("treats %s as a secret", (text) => {
    expect(looksLikeSecret(text)).toBe(true);
  });

  it.each(["Buy milk and eggs", "https://example.com/some/long/path", "abc", "note\nwith lines"])(
    "treats %s as text",
    (text) => {
      expect(looksLikeSecret(text)).toBe(false);
    },
  );
});
