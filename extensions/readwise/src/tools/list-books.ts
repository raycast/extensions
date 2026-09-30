import { fetchReadwise } from "../api";
import { BookParameters, BookResponse } from "../books/types";

type Input = {
  /** The type of library entries to list. Omit to include all categories. */
  category?: "books" | "articles" | "tweets" | "supplementals" | "podcasts";
  /** Page number, starting at 1. Increment when the response has a next URL. */
  page?: number;
  /** Number of entries per page, from 1 to 1000. Defaults to 100. */
  pageSize?: number;
};

/** List library entries. To find a title or author, inspect results and continue through pages as needed. */
export default async function listBooks(input: Input) {
  return fetchReadwise<BookResponse, BookParameters>("/v2/books", {
    category: input.category,
    page: input.page ?? 1,
    page_size: input.pageSize ?? 100,
  });
}
