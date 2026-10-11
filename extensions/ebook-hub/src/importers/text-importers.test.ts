import { describe, expect, it } from "vitest";

import { decodeText } from "./decode";
import { importMarkdown, importMarkdownString } from "./markdown";
import { importPlainText, importPlainTextString } from "./plain-text";

const encode = (text: string) => new TextEncoder().encode(text);

describe("importMarkdownString", () => {
  it("reads front matter and splits on H2 under a single H1 title", () => {
    const book = importMarkdownString(
      [
        "---",
        'title: "Front Title"',
        "author: A, B",
        "lang: en-US",
        "---",
        "# Book",
        "",
        "Intro text.",
        "",
        "## One",
        "",
        "Text one.",
        "",
        "## Two",
        "",
        "Text two.",
      ].join("\n"),
      "file",
    );

    expect(book).toMatchObject({ title: "Front Title", authors: ["A", "B"], language: "en-US" });
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(["Introduction", "One", "Two"]);
    expect(book.chapters[1].markdown.startsWith("## One")).toBe(true);
  });

  it("ignores unknown front matter lines and reads author lists", () => {
    const book = importMarkdownString(
      ["---", "just a note", "draft: true", 'authors: [Jane, "John"]', "language: fr", "---", "Body text."].join("\n"),
      "notes",
    );

    expect(book).toMatchObject({ title: "notes", authors: ["Jane", "John"], language: "fr" });
    expect(book.chapters).toEqual([{ title: "notes", markdown: "Body text." }]);
  });

  it("splits on H1 or H2 headings and ignores headings inside code fences", () => {
    expect(importMarkdownString("# A\n\nx\n\n# B\n\ny", "file").chapters.map((c) => c.title)).toEqual(["A", "B"]);
    expect(importMarkdownString("## One\n\nx\n\n## Two\n\ny", "file")).toMatchObject({ title: "file" });
    expect(importMarkdownString("## One\n\nx\n\n## Two\n\ny", "file").chapters.map((c) => c.title)).toEqual([
      "One",
      "Two",
    ]);

    const fenced = importMarkdownString("```\n# not\n```\n\n# Real\n\ntext", "file");
    expect(fenced.title).toBe("Real");
    expect(fenced.chapters).toHaveLength(1);
  });

  it("decodes bytes through the async importer", async () => {
    expect((await importMarkdown(encode("# Title\n\nText."), "file")).title).toBe("Title");
  });
});

describe("importPlainTextString", () => {
  it("detects Vietnamese and English chapter headings and escapes Markdown", () => {
    const book = importPlainTextString(
      [
        "Lời tựa ngắn.",
        "",
        "CHƯƠNG I: Mở đầu",
        "Nội dung một.",
        "",
        "Chapter 2",
        "# không phải heading",
        "1. không phải list",
      ].join("\n"),
      "sach",
    );

    expect(book.title).toBe("sach");
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(["Introduction", "CHƯƠNG I: Mở đầu", "Chapter 2"]);
    expect(book.chapters[2].markdown).toContain("\\# không phải heading");
    expect(book.chapters[2].markdown).toContain("1\\. không phải list");
  });

  it("keeps a single chapter when fewer than two headings exist", () => {
    expect(importPlainTextString("Chapter 1\nOnly one.", "solo").chapters).toHaveLength(1);
  });

  it("starts directly with a chapter when there is no preface", async () => {
    const book = await importPlainText(encode("Part 1\nFirst.\n\nPart 2\nSecond."), "parts");
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(["Part 1", "Part 2"]);
  });
});

describe("decodeText", () => {
  it("handles UTF-8 BOM, UTF-16 BOMs, and CRLF", () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x0d, 0x0a, 0x62]))).toBe("a\nb");
    expect(decodeText(new Uint8Array([0xff, 0xfe, 0x68, 0x00, 0x69, 0x00]))).toBe("hi");
    expect(decodeText(new Uint8Array([0xfe, 0xff, 0x00, 0x68, 0x00, 0x69]))).toBe("hi");
  });
});
