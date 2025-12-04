/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatHitUrl } from "../utils";

import { useState, useEffect, useMemo } from "react";
import algoliasearch from "algoliasearch/lite";
import { Toast, showToast } from "@raycast/api";
import { Algolia } from "../data/apis";

const DEFAULT_PARAMETERS = {
  highlightPreTag: "**",
  highlightPostTag: "**",
};

export function useAlgolia(query = "", currentAPI: Algolia) {
  const searchClient = useMemo(
    () => algoliasearch(currentAPI.appId, currentAPI.apiKey),
    [currentAPI.appId, currentAPI.apiKey],
  );

  const searchIndex = useMemo(() => searchClient.initIndex(currentAPI.indexName), [searchClient, currentAPI.indexName]);

  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useMemo(
    () => ({
      ...DEFAULT_PARAMETERS,
      ...currentAPI.searchParameters,
    }),
    [currentAPI.searchParameters],
  );

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    const performSearch = async () => {
      try {
        const res = await searchIndex.search(query, searchParams);

        if (controller.signal.aborted) return;

        formatHitUrl(res, currentAPI.homepage);
        setSearchResults(res.hits);
      } catch (err: any) {
        if (controller.signal.aborted) return;

        setSearchResults([]);
        showToast(Toast.Style.Failure, "Algolia Error", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();

    return () => {
      controller.abort();
    };
  }, [query, searchIndex, searchParams, currentAPI.homepage]);

  return { searchResults, isLoading };
}
