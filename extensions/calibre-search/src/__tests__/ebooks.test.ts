import {
  isEbookFile,
  parseCalibredbOutput,
  buildCalibredbArgs,
  findOpfPathInContainer,
  findCoverHrefInOpf,
} from "../ebooks";

// ─── isEbookFile ─────────────────────────────────────────────────────────────

describe("isEbookFile", () => {
  it("returns true for .epub", () =>
    expect(isEbookFile("book.epub")).toBe(true));
  it("returns true for .mobi", () =>
    expect(isEbookFile("novel.mobi")).toBe(true));
  it("returns true for .pdf", () =>
    expect(isEbookFile("manual.pdf")).toBe(true));
  it("returns true for .azw3", () =>
    expect(isEbookFile("story.azw3")).toBe(true));
  it("returns true for .azw", () =>
    expect(isEbookFile("story.azw")).toBe(true));
  it("returns true for .kepub", () =>
    expect(isEbookFile("guide.kepub")).toBe(true));
  it("returns false for .txt", () =>
    expect(isEbookFile("notes.txt")).toBe(false));
  it("returns false for .docx", () =>
    expect(isEbookFile("report.docx")).toBe(false));
  it("is case-insensitive (.EPUB)", () =>
    expect(isEbookFile("Book.EPUB")).toBe(true));
  it("is case-insensitive (.Mobi)", () =>
    expect(isEbookFile("Novel.Mobi")).toBe(true));
  it("returns false for file with no extension", () =>
    expect(isEbookFile("README")).toBe(false));
});

// ─── parseCalibredbOutput ─────────────────────────────────────────────────────

describe("parseCalibredbOutput", () => {
  it("parses single book id from success output", () =>
    expect(parseCalibredbOutput("Added book ids: 42")).toEqual({
      addedIds: [42],
    }));

  it("parses multiple book ids", () =>
    expect(parseCalibredbOutput("Added book ids: 15, 16, 17")).toEqual({
      addedIds: [15, 16, 17],
    }));

  it("returns empty array for empty string", () =>
    expect(parseCalibredbOutput("")).toEqual({ addedIds: [] }));

  it("returns empty array for error output", () =>
    expect(parseCalibredbOutput("Error: could not add book")).toEqual({
      addedIds: [],
    }));

  it("returns empty array when book already exists", () =>
    expect(parseCalibredbOutput("Book already exists in library")).toEqual({
      addedIds: [],
    }));

  it("filters out NaN when output is malformed after match", () =>
    expect(parseCalibredbOutput("Added book ids: abc, 5")).toEqual({
      addedIds: [5],
    }));
});

// ─── buildCalibredbArgs ───────────────────────────────────────────────────────

describe("buildCalibredbArgs", () => {
  it("returns correct args array for calibredb add", () => {
    expect(
      buildCalibredbArgs("/downloads/book.epub", "/Users/me/Calibre Library"),
    ).toEqual([
      "add",
      "--library-path",
      "/Users/me/Calibre Library",
      "/downloads/book.epub",
    ]);
  });

  it("preserves file paths with spaces verbatim", () => {
    const args = buildCalibredbArgs("/my books/great novel.epub", "/Library");
    expect(args[args.length - 1]).toBe("/my books/great novel.epub");
  });

  it("preserves library paths with spaces verbatim", () => {
    const args = buildCalibredbArgs(
      "/book.epub",
      "/Users/me/My Calibre Library",
    );
    expect(args[2]).toBe("/Users/me/My Calibre Library");
  });
});

// ─── findOpfPathInContainer ───────────────────────────────────────────────────

describe("findOpfPathInContainer", () => {
  it("extracts OPF path from a standard container.xml", () => {
    const xml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    expect(findOpfPathInContainer(xml)).toBe("OEBPS/content.opf");
  });

  it("handles OPF at root level (no subdirectory)", () => {
    const xml = `<rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>`;
    expect(findOpfPathInContainer(xml)).toBe("content.opf");
  });

  it("returns null for malformed container.xml", () => {
    expect(findOpfPathInContainer("<container></container>")).toBeNull();
  });
});

// ─── findCoverHrefInOpf ───────────────────────────────────────────────────────

describe("findCoverHrefInOpf", () => {
  it("finds cover via EPUB2 meta name='cover' pattern", () => {
    const opf = `<package>
  <metadata>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="cover-img" href="images/cover.jpg" media-type="image/jpeg"/>
  </manifest>
</package>`;
    expect(findCoverHrefInOpf(opf)).toBe("images/cover.jpg");
  });

  it("finds cover via EPUB3 properties='cover-image' pattern", () => {
    const opf = `<manifest>
  <item properties="cover-image" href="images/cover.png" media-type="image/png"/>
</manifest>`;
    expect(findCoverHrefInOpf(opf)).toBe("images/cover.png");
  });

  it("returns null when no cover reference is found", () => {
    expect(
      findCoverHrefInOpf("<package><manifest></manifest></package>"),
    ).toBeNull();
  });

  it("handles meta tag with attributes in different order", () => {
    const opf = `<meta content="my-cover" name="cover"/>
<item href="cover.jpeg" id="my-cover" media-type="image/jpeg"/>`;
    expect(findCoverHrefInOpf(opf)).toBe("cover.jpeg");
  });
});
