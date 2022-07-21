import { useCallback, useEffect, useState } from "react";
import { isEmpty, sortBooksByPreferredLanguages, sortBooksByPreferredFileFormats } from "../utils/common-utils";
import { getLibgenSearchResults } from "../utils/libgen-api";
import { BookEntry, LibgenPreferences, SearchPriority } from "../types";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import Style = Toast.Style;

export const searchBooksOnLibgen = (searchContent: string) => {
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setBooks([]);

    // not loading when search is empty
    if (isEmpty(searchContent)) {
      setLoading(false);
      return;
    }
    setLoading(true);

    getLibgenSearchResults(searchContent.trim())
      .then((books) => {
        const { searchPriority, preferredLanguages, preferredFormats } = getPreferenceValues<LibgenPreferences>();

        // sort books by search priority
        if (+searchPriority === SearchPriority.PreferredLanguages) {
          console.log("Sorting by preferred languages:", preferredLanguages);
          books = sortBooksByPreferredLanguages(books, preferredLanguages);
        }

        if (+searchPriority === SearchPriority.PreferredFileFormats) {
          console.log("Sorting by preferred formats:", preferredFormats);
          books = sortBooksByPreferredFileFormats(books, preferredFormats);
        }

        setBooks(books);
        setLoading(false);
      })
      .catch((error: Error) => {
        console.error(error);
        setLoading(false);
        showToast(Style.Failure, String(error));
      });
  }, [searchContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { books: books, loading: loading };
};
