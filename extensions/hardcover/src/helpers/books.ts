import { ListBook, Book, FeaturedSeries } from "../api/books";
import { Contribution } from "../api/books";
import { List } from "../api/lists";

/**
 * Formats the list of authors for a book into a comma-separated string
 *
 * @param contributions The array of author contributions
 * @returns A string of author names separated by commas
 */
export function formatAuthors(contributions: Contribution[]): string {
  return contributions.map((c) => c.author?.name).join(", ") || "";
}

/**
 * Formats the series position for a book into a string
 *
 * @param featured_series The FeaturedSeries object containing series information
 * @returns A string of the series position and name, or an empty string if no valid series info
 */
export function formatSeriesPosition(featured_series: FeaturedSeries | undefined): string {
  if (!featured_series || !featured_series.series?.name || featured_series.position == null) {
    return "";
  }

  return `#${featured_series.position} in ${featured_series.series.name}`;
}

/**
 * Formats the user's book lists into an array of list names
 *
 * @param listBooks The list of listBook objects
 * @returns An array of lists the book is added to, or an empty array if none
 */
export function formatUserBookLists(listBooks: ListBook[]): string[] {
  return listBooks.map((list_book) => list_book.list?.name || "").filter(Boolean);
}

/**
 * Gets the user's reading status for a book
 *
 * @param book The Book object containing user book information
 * @returns The reading status string or empty string if not set
 */
export function formatUserBookStatus(book: Book | undefined): string {
  return book?.user_books?.[0]?.user_book_status?.status || "";
}

/**
 * Gets the user's rating for a book
 *
 * @param book The Book object containing user book information
 * @returns The rating number or 0 if not rated
 */
export function formatUserBookRating(book: Book | undefined): number {
  return book?.user_books?.[0]?.rating || 0;
}

/**
 * Get lists that the book can be added to
 *
 * @param allLists All lists
 * @param book The book object containing list information
 * @returns Lists that the book is not already in
 */
export function getAvailableLists(allLists: List[] | undefined, book: Book | undefined): List[] {
  if (!allLists) return [];

  const existingListIds = book?.list_books?.map((list_book) => list_book.list?.id) || [];
  return allLists.filter((list) => !existingListIds.includes(list.id));
}

/**
 * Gets a formatted string of author with series position
 *
 * @param authorNames Author names formatted by formatAuthors
 * @param seriesPosition Series position formatted by formatSeriesPosition
 * @returns Formatted string of author with series position
 */
export function formatAuthorsWithSeries(authorNames: string, seriesPosition: string): string {
  if (!authorNames && !seriesPosition) {
    return "";
  } else if (!authorNames) {
    return seriesPosition;
  } else if (!seriesPosition) {
    return authorNames;
  }

  return `${authorNames} • ${seriesPosition}`;
}
