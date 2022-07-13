import { useCallback, useEffect, useState } from "react";
import { isEmpty, getLibgenSearchResult } from "../utils/common-utils";
import { BookEntry } from "../types";
import { showToast, Toast } from "@raycast/api";
import Style = Toast.Style;

export const searchBookOnLibgen = (searchContent: string) => {
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

    getLibgenSearchResult(searchContent.trim())
      .then((books) => {
        setBooks(books);
        setLoading(false);
      })
      .catch((error: Error) => {
        setLoading(false);
        showToast(Style.Failure, String(error));
      });
  }, [searchContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { books: books, loading: loading };
};
