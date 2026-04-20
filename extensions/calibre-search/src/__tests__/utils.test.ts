import { join } from "path";
import {
  stripHtml,
  extractYear,
  parseFormatData,
  preferredFormat,
  filterBooks,
  buildCoverPath,
  buildBookFolderPath,
  formatFileSize,
} from "../utils";
import type { Book, FormatEntry } from "../types";

// ─── stripHtml ───────────────────────────────────────────────────────────────

describe("stripHtml", () => {
  it("removes basic HTML tags", () => {
    expect(stripHtml("<p>Hello world</p>")).toBe("Hello world");
  });

  it("removes nested tags", () => {
    expect(stripHtml("<b><i>Bold italic</i></b>")).toBe("Bold italic");
  });

  it("collapses multiple whitespace and newlines into single spaces", () => {
    expect(stripHtml("<p>Line one</p><p>Line two</p>").trim()).toBe(
      "Line one Line two",
    );
  });

  it("returns empty string for null-like empty input", () => {
    expect(stripHtml("")).toBe("");
  });

  it("leaves plain text untouched", () => {
    expect(stripHtml("Just plain text.")).toBe("Just plain text.");
  });

  it("handles HTML entities for angle brackets", () => {
    expect(stripHtml("&lt;b&gt;test&lt;/b&gt;")).toBe("<b>test</b>");
  });

  it("handles Calibre-style synopsis with bold and line breaks", () => {
    const html =
      "<b>MIT psychologist</b> and bestselling author.<br/>Second line.";
    const result = stripHtml(html);
    expect(result).not.toContain("<");
    expect(result).toContain("MIT psychologist");
    expect(result).toContain("Second line.");
  });
});

// ─── extractYear ─────────────────────────────────────────────────────────────

describe("extractYear", () => {
  it("extracts year from Calibre pubdate format", () => {
    expect(extractYear("2021-03-02 00:00:00+00:00")).toBe(2021);
  });

  it("extracts year from ISO timestamp with timezone offset", () => {
    expect(extractYear("1937-09-21 23:00:00+00:00")).toBe(1937);
  });

  it("returns null for null input", () => {
    expect(extractYear(null)).toBeNull();
  });

  it("returns null for the Calibre unknown date sentinel", () => {
    expect(extractYear("0101-01-01 00:00:00+00:00")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractYear("")).toBeNull();
  });

  it("handles ISO-8601 date-only strings", () => {
    expect(extractYear("2015-04-07")).toBe(2015);
  });
});

// ─── parseFormatData ─────────────────────────────────────────────────────────

describe("parseFormatData", () => {
  it("parses a single format entry", () => {
    const result = parseFormatData("EPUB|My Book - Author Name");
    expect(result).toEqual<FormatEntry[]>([
      { format: "EPUB", name: "My Book - Author Name" },
    ]);
  });

  it("parses multiple format entries separated by semicolon", () => {
    const result = parseFormatData(
      "EPUB|My Book - Author;MOBI|My Book - Author",
    );
    expect(result).toEqual<FormatEntry[]>([
      { format: "EPUB", name: "My Book - Author" },
      { format: "MOBI", name: "My Book - Author" },
    ]);
  });

  it("returns empty array for null", () => {
    expect(parseFormatData(null)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseFormatData("")).toEqual([]);
  });

  it("handles format names that contain a pipe character", () => {
    const result = parseFormatData("EPUB|Title with | pipe - Author");
    expect(result[0].format).toBe("EPUB");
    expect(result[0].name).toBe("Title with | pipe - Author");
  });
});

// ─── preferredFormat ─────────────────────────────────────────────────────────

describe("preferredFormat", () => {
  it("prefers EPUB over other formats", () => {
    const entries: FormatEntry[] = [
      { format: "AZW3", name: "book" },
      { format: "EPUB", name: "book" },
      { format: "PDF", name: "book" },
    ];
    expect(preferredFormat(entries)?.format).toBe("EPUB");
  });

  it("falls back to MOBI when no EPUB", () => {
    const entries: FormatEntry[] = [
      { format: "MOBI", name: "book" },
      { format: "AZW3", name: "book" },
    ];
    expect(preferredFormat(entries)?.format).toBe("MOBI");
  });

  it("falls back to PDF when no EPUB or MOBI", () => {
    const entries: FormatEntry[] = [
      { format: "PDF", name: "book" },
      { format: "AZW3", name: "book" },
    ];
    expect(preferredFormat(entries)?.format).toBe("PDF");
  });

  it("returns first entry when no preferred format matches", () => {
    const entries: FormatEntry[] = [
      { format: "AZW3", name: "book" },
      { format: "KEPUB", name: "book" },
    ];
    expect(preferredFormat(entries)).toEqual({ format: "AZW3", name: "book" });
  });

  it("returns null for empty array", () => {
    expect(preferredFormat([])).toBeNull();
  });
});

// ─── filterBooks ─────────────────────────────────────────────────────────────

const mockBooks: Book[] = [
  {
    id: 1,
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    year: 1937,
    publisher: "Allen & Unwin",
    series: "The Lord of the Rings",
    seriesIndex: 0,
    formats: [{ format: "EPUB", name: "The Hobbit - Tolkien" }],
    comments: "A hobbit's adventure.",
    coverPath: "/lib/hobbit/cover.jpg",
    bookFolderPath: "/lib/hobbit",
  },
  {
    id: 2,
    title: "Dune",
    author: "Frank Herbert",
    year: 1965,
    publisher: "Chilton Books",
    series: null,
    seriesIndex: null,
    formats: [{ format: "EPUB", name: "Dune - Herbert" }],
    comments: "A desert planet epic.",
    coverPath: "/lib/dune/cover.jpg",
    bookFolderPath: "/lib/dune",
  },
  {
    id: 3,
    title: "Foundation",
    author: "Isaac Asimov",
    year: 1951,
    publisher: null,
    series: "Foundation",
    seriesIndex: 1,
    formats: [{ format: "MOBI", name: "Foundation - Asimov" }],
    comments: null,
    coverPath: null,
    bookFolderPath: "/lib/foundation",
  },
];

describe("filterBooks", () => {
  it("returns all books for empty query", () => {
    expect(filterBooks(mockBooks, "")).toHaveLength(3);
  });

  it("matches by title (case-insensitive)", () => {
    const result = filterBooks(mockBooks, "hobbit");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("The Hobbit");
  });

  it("matches by author (case-insensitive)", () => {
    const result = filterBooks(mockBooks, "tolkien");
    expect(result).toHaveLength(1);
    expect(result[0].author).toBe("J.R.R. Tolkien");
  });

  it("matches partial title substring", () => {
    const result = filterBooks(mockBooks, "oun");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Foundation");
  });

  it("returns empty array when nothing matches", () => {
    expect(filterBooks(mockBooks, "xyzzy")).toHaveLength(0);
  });

  it("matches multiple books when query is common substring", () => {
    const result = filterBooks(mockBooks, "a");
    expect(result.length).toBeGreaterThan(1);
  });

  it("trims whitespace from query before matching", () => {
    const result = filterBooks(mockBooks, "  dune  ");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Dune");
  });
});

// ─── buildCoverPath ───────────────────────────────────────────────────────────

describe("buildCoverPath", () => {
  it("constructs path to cover.jpg within the book folder", () => {
    const result = buildCoverPath(
      "/Users/me/Calibre Library",
      "J.R.R. Tolkien/The Hobbit (1)",
    );
    expect(result).toBe(
      join(
        "/Users/me/Calibre Library",
        "J.R.R. Tolkien/The Hobbit (1)",
        "cover.jpg",
      ),
    );
  });

  it("handles library paths with trailing slash", () => {
    const result = buildCoverPath(
      "/Users/me/Calibre Library/",
      "Author/Book (2)",
    );
    expect(result).toContain("cover.jpg");
    expect(result).not.toContain("//");
  });
});

// ─── buildBookFolderPath ──────────────────────────────────────────────────────

describe("buildBookFolderPath", () => {
  it("constructs the absolute path to the book folder", () => {
    const result = buildBookFolderPath(
      "/Users/me/Calibre Library",
      "Author Name/Book Title (10)",
    );
    expect(result).toBe(
      join("/Users/me/Calibre Library", "Author Name/Book Title (10)"),
    );
  });
});

// ─── formatFileSize ───────────────────────────────────────────────────────────

describe("formatFileSize", () => {
  it("formats bytes under 1 KB", () =>
    expect(formatFileSize(512)).toBe("512 B"));
  it("formats kilobytes", () => expect(formatFileSize(1536)).toBe("1.5 KB"));
  it("formats megabytes", () =>
    expect(formatFileSize(1_572_864)).toBe("1.5 MB"));
  it("formats exact 1 MB", () =>
    expect(formatFileSize(1_048_576)).toBe("1.0 MB"));
});
