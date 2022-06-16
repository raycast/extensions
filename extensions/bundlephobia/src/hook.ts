import { useState, useCallback, useRef, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { fetchSizeBundlephobia, fetchSuggestionsBundlephobia } from "./fetchUtils";
import { NpmsFetchResponse } from "./packagesResponse";
import { PackageResultModel } from "./packageRepsonse";

export function useSearch() {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<NpmsFetchResponse>([]);
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText = "") {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);
      try {
        if (!searchText) {
          setResults([]);
        } else {
          const results = await fetchSuggestionsBundlephobia(searchText, cancelRef.current.signal);
          setResults(results);
        }
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        console.error("search error", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not perform search",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [cancelRef, setIsLoading, setResults]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return [results, isLoading, search] as const;
}

export function useGetDetail() {
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<PackageResultModel>(null);
  const cancelRef = useRef<AbortController | null>(null);

  const select = useCallback(
    //eslint-disable-next-line @typescript-eslint/no-empty-function
    async function select(id = "", callback = () => {}) {
      const [packageName, version] = id?.split("|") || [];

      if (packageName && version) {
        setIsLoading(true);
        cancelRef.current?.abort();
        cancelRef.current = new AbortController();
        try {
          const detailResponse = await fetchSizeBundlephobia(packageName, cancelRef.current.signal);
          callback(packageName, version);
          setDetail(detailResponse);
        } catch (error) {
          if (error instanceof AbortError) {
            return;
          }
          console.error("show detail error", error);
          showToast({
            style: Toast.Style.Failure,
            title: "Could not show detail of package",
            message: String(error),
          });
        } finally {
          setIsLoading(false);
        }
      }
    },
    [cancelRef, setIsLoading, setDetail]
  );

  useEffect(() => {
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return [detail, isLoading, select] as const;
}
