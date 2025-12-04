import { useCallback } from "react";
import type { Book } from "./types";
import { usePersistentState } from "./usePersistentState";

const MAX_RECENT_VIEWS = 10;
const RECENT_VIEWS_CACHE_KEY = "rvb";

export interface RecentlyViewedBooks {
  recentlyViewedBooks: Book[];
  addRecentView: (book: Book) => void;
  clearAllRecentViews: () => void;
  clearRecentlyViewedBook: (bookId: string) => void;
}

export function useRecentlyViewedBooks(): RecentlyViewedBooks {
  const [recentlyViewedBooks, setRecentlyViewedBooks] = usePersistentState<Book[]>(RECENT_VIEWS_CACHE_KEY, []);

  const addRecentView = useCallback(
    (book: Book) => {
      setRecentlyViewedBooks((currentBooks: Book[]) => {
        const updatedBooks = [...currentBooks];

        // Check if the book already exists (by ID)
        const existingIndex = updatedBooks.findIndex((b) => b.id === book.id);

        if (existingIndex !== -1) {
          // Remove the existing book to move it to the front
          updatedBooks.splice(existingIndex, 1);
        } else if (updatedBooks.length >= MAX_RECENT_VIEWS) {
          // Remove the oldest book if we have reached the max limit
          updatedBooks.pop();
        }

        // Add the book to the front of the list
        updatedBooks.unshift(book);
        return updatedBooks;
      });
    },
    [setRecentlyViewedBooks]
  );

  const clearAllRecentViews = useCallback(() => {
    setRecentlyViewedBooks([]);
  }, [setRecentlyViewedBooks]);

  const clearRecentlyViewedBook = useCallback(
    (bookId: string) => {
      setRecentlyViewedBooks((currentBooks: Book[]) => {
        return currentBooks.filter((book) => book.id !== bookId);
      });
    },
    [setRecentlyViewedBooks]
  );

  return {
    recentlyViewedBooks,
    addRecentView,
    clearAllRecentViews,
    clearRecentlyViewedBook,
  };
}
