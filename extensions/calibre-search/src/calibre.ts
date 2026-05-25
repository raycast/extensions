import type { Book, BookRow } from "./types";
import {
  buildBookFolderPath,
  buildCoverPath,
  extractYear,
  parseFormatData,
  stripHtml,
} from "./utils";

export const ALL_BOOKS_QUERY = `
  SELECT
    b.id,
    b.title,
    b.pubdate,
    b.series_index,
    b.path,
    b.has_cover,
    GROUP_CONCAT(a.name, ' & ') AS authors,
    p.name AS publisher,
    s.name AS series,
    c.text AS comments,
    GROUP_CONCAT(d.format || '|' || d.name, ';') AS format_data
  FROM books b
  LEFT JOIN books_authors_link bal ON bal.book = b.id
  LEFT JOIN authors a ON a.id = bal.author
  LEFT JOIN books_publishers_link bpl ON bpl.book = b.id
  LEFT JOIN publishers p ON p.id = bpl.publisher
  LEFT JOIN books_series_link bsl ON bsl.book = b.id
  LEFT JOIN series s ON s.id = bsl.series
  LEFT JOIN comments c ON c.book = b.id
  LEFT JOIN data d ON d.book = b.id
  GROUP BY b.id
  ORDER BY b.timestamp DESC
`.trim();

export function mapRow(row: BookRow, libraryPath: string): Book {
  const authors = row.authors ?? "";
  const author = authors.split(" & ")[0].trim() || "Unknown Author";

  return {
    id: row.id,
    title: row.title,
    author,
    year: extractYear(row.pubdate),
    publisher: row.publisher ?? null,
    series: row.series ?? null,
    seriesIndex: row.series != null ? row.series_index : null,
    formats: parseFormatData(row.format_data),
    comments: row.comments ? stripHtml(row.comments) : null,
    coverPath: row.has_cover ? buildCoverPath(libraryPath, row.path) : null,
    bookFolderPath: buildBookFolderPath(libraryPath, row.path),
  };
}
