/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatHitUrl } from "../utils";

import MeiliSearch from "meilisearch";
import { useState, useEffect, useMemo } from "react";
import { Toast, showToast } from "@raycast/api";
import { Meilisearch } from "../data/apis";

export function useMeilisearch(query = "", currentAPI: Meilisearch) {
  const searchClient = useMemo(
    () =>
      new MeiliSearch({
        host: currentAPI.apiHost,
        apiKey: currentAPI.apiKey,
      }),
    [currentAPI.apiHost, currentAPI.apiKey],
  );

  const searchIndex = useMemo(() => searchClient.index(currentAPI.indexName), [searchClient, currentAPI.indexName]);

  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    const performSearch = async () => {
      try {
        const res = await searchIndex.search(query, currentAPI.searchParameters);

        if (controller.signal.aborted) return;

        formatHitUrl(res, currentAPI.homepage);
        setSearchResults(res.hits);
      } catch (err: any) {
        if (controller.signal.aborted) return;

        setSearchResults([]);
        showToast(Toast.Style.Failure, "Meilisearch Error", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();

    return () => {
      controller.abort();
    };
  }, [query, searchIndex, currentAPI.searchParameters, currentAPI.homepage]);

  return { searchResults, isLoading };
}
