import { mapRow, ALL_BOOKS_QUERY } from "../calibre";
import type { BookRow } from "../types";

const LIBRARY = "/Users/me/Calibre Library";

const baseRow: BookRow = {
  id: 42,
  title: "Dune",
  pubdate: "1965-08-01 00:00:00+00:00",
  series_index: 1.0,
  path: "Frank Herbert/Dune (42)",
  has_cover: 1,
  authors: "Frank Herbert",
  publisher: "Chilton Books",
  series: "Dune Chronicles",
  comments: "<p>A desert planet epic.</p>",
  format_data: "EPUB|Dune - Frank Herbert;MOBI|Dune - Frank Herbert",
};

describe("mapRow", () => {
  it("maps id and title", () => {
    const book = mapRow(baseRow, LIBRARY);
    expect(book.id).toBe(42);
    expect(book.title).toBe("Dune");
  });

  it("uses the first author from GROUP_CONCAT result", () => {
    const book = mapRow(baseRow, LIBRARY);
    expect(book.author).toBe("Frank Herbert");
  });

  it("uses first author when multiple authors are concatenated", () => {
    const row: BookRow = { ...baseRow, authors: "Author One & Author Two" };
    const book = mapRow(row, LIBRARY);
    expect(book.author).toBe("Author One");
  });

  it("preserves Last, First author format without truncation", () => {
    const row: BookRow = { ...baseRow, authors: "Tolkien, J.R.R." };
    const book = mapRow(row, LIBRARY);
    expect(book.author).toBe("Tolkien, J.R.R.");
  });

  it("uses Unknown Author when authors is null", () => {
    const row: BookRow = { ...baseRow, authors: null };
    const book = mapRow(row, LIBRARY);
    expect(book.author).toBe("Unknown Author");
  });

  it("extracts year from pubdate", () => {
    const book = mapRow(baseRow, LIBRARY);
    expect(book.year).toBe(1965);
  });

  it("sets year to null for unknown Calibre date", () => {
    const row: BookRow = { ...baseRow, pubdate: "0101-01-01 00:00:00+00:00" };
    const book = mapRow(row, LIBRARY);
    expect(book.year).toBeNull();
  });

  it("maps publisher", () => {
    const book = mapRow(baseRow, LIBRARY);
    expect(book.publisher).toBe("Chilton Books");
  });

  it("maps series name and index", () => {
    const book = mapRow(baseRow, LIBRARY);
    expect(book.series).toBe("Dune Chronicles");
    expect(book.seriesIndex).toBe(1.0);
  });

  it("sets series to null when not present", () => {
    const row: BookRow = { ...baseRow, series: null };
    const book = mapRow(row, LIBRARY);
    expect(book.series).toBeNull();
    expect(book.seriesIndex).toBeNull();
  });

  it("parses formats from format_data", () => {
    const book = mapRow(baseRow, LIBRARY);
    expect(book.formats).toHaveLength(2);
    expect(book.formats[0]).toEqual({
      format: "EPUB",
      name: "Dune - Frank Herbert",
    });
    expect(book.formats[1]).toEqual({
      format: "MOBI",
      name: "Dune - Frank Herbert",
    });
  });

  it("strips HTML from comments", () => {
    const book = mapRow(baseRow, LIBRARY);
    expect(book.comments).toBe("A desert planet epic.");
  });

  it("sets comments to null when no comments in row", () => {
    const row: BookRow = { ...baseRow, comments: null };
    const book = mapRow(row, LIBRARY);
    expect(book.comments).toBeNull();
  });

  it("constructs coverPath when has_cover is 1", () => {
    const book = mapRow(baseRow, LIBRARY);
    expect(book.coverPath).toBe(`${LIBRARY}/Frank Herbert/Dune (42)/cover.jpg`);
  });

  it("sets coverPath to null when has_cover is 0", () => {
    const row: BookRow = { ...baseRow, has_cover: 0 };
    const book = mapRow(row, LIBRARY);
    expect(book.coverPath).toBeNull();
  });

  it("constructs bookFolderPath", () => {
    const book = mapRow(baseRow, LIBRARY);
    expect(book.bookFolderPath).toBe(`${LIBRARY}/Frank Herbert/Dune (42)`);
  });
});

describe("ALL_BOOKS_QUERY", () => {
  it("is a non-empty string", () => {
    expect(typeof ALL_BOOKS_QUERY).toBe("string");
    expect(ALL_BOOKS_QUERY.length).toBeGreaterThan(0);
  });

  it("selects from the books table", () => {
    expect(ALL_BOOKS_QUERY.toLowerCase()).toContain("from books");
  });

  it("joins the authors table", () => {
    expect(ALL_BOOKS_QUERY.toLowerCase()).toContain("authors");
  });

  it("includes format_data in the SELECT", () => {
    expect(ALL_BOOKS_QUERY).toContain("format_data");
  });

  it("groups by book id to collapse join rows", () => {
    expect(ALL_BOOKS_QUERY.toLowerCase()).toContain("group by");
  });
});
