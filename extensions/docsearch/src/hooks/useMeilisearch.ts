/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatHitUrl } from "../utils";

import MeiliSearch from "meilisearch";
import { useState, useEffect } from "react";
import { Toast, showToast } from "@raycast/api";
import { Meilisearch } from "../data/apis";

export function useMeilisearch(query = "", currentAPI: Meilisearch) {
  const searchClient = new MeiliSearch({
    host: currentAPI.apiHost,
    apiKey: currentAPI.apiKey,
  });
  const searchIndex = searchClient.index(currentAPI.indexName);

  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let flag = true;
    setIsLoading(true);

    searchIndex
      .search(query, currentAPI.searchParameters)
      .then((res: any) => {
        setIsLoading(false);

        if (!flag) return;

        formatHitUrl(res, currentAPI.homepage);
        setSearchResults(res.hits);
      })
      .catch((err: { message: string | undefined }) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Meilisearch Error", err.message);

        return [];
      });

    return () => {
      flag = false;
    };
  }, [query, currentAPI]);

  return { searchResults, isLoading };
}
