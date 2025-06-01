import { Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useRef, useCallback } from "react";
import { OpdsBook, SearchStatus } from "./types";
import { BookListItem } from "./components/BookListItem";
import { searchBooks } from "./services/opdsService";

/* Custom hook to debounce a value with a specified delay
 *
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [books, setBooks] = useState<OpdsBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");

  const debouncedSearchText = useDebounce(searchText, 500);

  const abortControllerRef = useRef<AbortController | null>(null);

  const isInitialRender = useRef(true);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [searchText]);

  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length === 0) {
      setBooks([]);
      setSearchStatus("idle");
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setSearchStatus("searching");

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Searching...",
        message: `Looking for "${query}"`,
      });

      const results = await searchBooks(query, abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }

      setBooks(results);

      if (results.length > 0) {
        setSearchStatus("found");
        await showToast({
          style: Toast.Style.Success,
          title: "Found Books",
          message: `Found ${results.length} books for "${query}"`,
        });
      } else {
        setSearchStatus("not_found");
        await showToast({
          style: Toast.Style.Failure,
          title: "No Results",
          message: `No books found for "${query}"`,
        });
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }

      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setSearchStatus("not_found");
        const errorMessage = error instanceof Error ? error.message : String(error);

        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `Failed to search books: ${errorMessage}`,
        });
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (debouncedSearchText) {
      performSearch(debouncedSearchText);
    } else {
      setBooks([]);
      setSearchStatus("idle");
    }
  }, [debouncedSearchText, performSearch]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for books... (updates as you type)"
      throttle
    >
      {searchStatus === "not_found" ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No Results Found"
          description="Try a different search term"
        />
      ) : searchStatus === "idle" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for Books"
          description="Start typing to search for books on Flibusta"
        />
      ) : (
        books.map((book, index) => <BookListItem key={index} book={book} />)
      )}
    </List>
  );
}
