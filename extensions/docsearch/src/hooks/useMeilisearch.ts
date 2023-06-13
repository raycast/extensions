/* eslint-disable @typescript-eslint/no-explicit-any */
import { TMeilisearch } from "../types";
import { formatHitUrl } from "../utils";

import MeiliSearch from "meilisearch";
import { useState, useEffect } from "react";
import { Toast, showToast } from "@raycast/api";

export function useMeilisearch(query = "", currentAPI: TMeilisearch) {
  const searchClient = new MeiliSearch({
    host: currentAPI.apiHost,
    apiKey: currentAPI.apiKey,
  });
  const searchIndex = searchClient.index(currentAPI.indexName);

  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    searchIndex
      .search(query)
      .then((res: any) => {
        setIsLoading(false);
        formatHitUrl(res, currentAPI.homepage);

        setSearchResults(res.hits);
      })
      .catch((err: { message: string | undefined }) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Meilisearch Error", err.message);

        return [];
      });
  }, [query]);

  return { searchResults, isLoading };
}
