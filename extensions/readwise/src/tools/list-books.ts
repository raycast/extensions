import { fetchReadwise } from "../api";
import { BookParameters, BookResponse } from "../books/types";

type Input = {
  /** Search titles and authors within at most five pages. Returns search.complete and search.nextPage. */
  query?: string;
  /** The type of library entries to list. Omit to include all categories. */
  category?: "books" | "articles" | "tweets" | "supplementals" | "podcasts";
  /** Page number, starting at 1. For query searches, continue from search.nextPage only when the user asks. */
  page?: number;
  /** Number of entries per page, from 1 to 1000. Defaults to 1000 for query searches and 100 for browsing. */
  pageSize?: number;
};

/**
 * List library entries. When finding a title or author, pass query to use bounded search instead of browsing every page.
 * If search.complete is false, the lookup is incomplete. Do not call list-books again for the same request.
 * Never claim the title is absent after an incomplete search. Only use search.nextPage if the user asks to continue.
 * Ask for a library entry ID from a Readwise link, a narrower category, or a new request to continue.
 * Stop calling tools if a rate-limit error is reported; tell the user when to retry.
 */
export default async function listBooks(input: Input) {
  const query = input.query?.trim().toLowerCase();
  if (query) {
    const results: BookResponse["results"] = [];
    let page = input.page ?? 1;
    for (let pagesScanned = 1; pagesScanned <= 5; pagesScanned += 1) {
      const response = await fetchReadwise<BookResponse, BookParameters>("/v2/books", {
        category: input.category,
        page,
        page_size: input.pageSize ?? 1000,
      });
      results.push(
        ...response.results.filter(
          (book) => book.title.toLowerCase().includes(query) || book.author?.toLowerCase().includes(query)
        )
      );
      if (!response.next || pagesScanned === 5) {
        return {
          count: results.length,
          next: null,
          previous: null,
          results,
          search: { complete: !response.next, nextPage: response.next ? page + 1 : null, pagesScanned },
        };
      }
      page += 1;
    }
  }
  return fetchReadwise<BookResponse, BookParameters>("/v2/books", {
    category: input.category,
    page: input.page ?? 1,
    page_size: input.pageSize ?? 100,
  });
}
