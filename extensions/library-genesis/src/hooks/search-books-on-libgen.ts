import { useCallback, useEffect, useState } from "react";
import { isEmpty, sortBooksByPreferredLanguages } from "../utils/common-utils";
import { getLibgenSearchResults } from "../utils/libgen-api";
import { BookEntry, LibgenPreferences } from "../types";
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
        const { preferredLanguages, priotizePreferredLanguage } = getPreferenceValues<LibgenPreferences>();

        if (priotizePreferredLanguage) {
          books = sortBooksByPreferredLanguages(books, preferredLanguages);
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
