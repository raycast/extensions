import { useCallback, useEffect, useMemo, useState } from "react";

import { Toast, getPreferenceValues, showToast } from "@raycast/api";

import type { BookEntry, LibgenPreferences, SearchType } from "@/types";
import { SearchPriority } from "@/types";
import { getLibgenSearchResults } from "@/utils/api";
import { sortBooksByPreferredFileFormats, sortBooksByPreferredLanguages } from "@/utils/books";
import { isEmpty } from "@/utils/common";
import { DEFAULT_MIRROR } from "@/utils/constants";

import useFastestMirror from "./use-fastest-mirror";

export const searchBooksOnLibgen = (searchContent: string, searchType: SearchType) => {
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { mirror } = useFastestMirror();
  const { searchPriority, preferredFormats, preferredLanguages, preferredLibgenMirror } = useMemo(
    () => getPreferenceValues<LibgenPreferences>(),
    [],
  );

  const chosenMirror = useMemo(() => {
    if (preferredLibgenMirror) {
      return preferredLibgenMirror;
    }
    return mirror || DEFAULT_MIRROR.url;
  }, [mirror, preferredLibgenMirror]);

  const fetchData = useCallback(
    (signal: AbortSignal) => {
      setBooks([]);

      // not loading when search is empty
      if (isEmpty(searchContent) || !chosenMirror) {
        setLoading(false);
        return;
      }
      setLoading(true);

      getLibgenSearchResults(searchContent.trim(), chosenMirror, signal, searchType)
        .then((books) => {
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
          showToast(Toast.Style.Failure, String(error));
        });
    },
    [searchContent, chosenMirror, searchType],
  );

  useEffect(() => {
    const abortController = new AbortController();
    void fetchData(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [fetchData]);

  return { books: books, loading: loading };
};
