/* eslint-disable @typescript-eslint/no-explicit-any */
import { TAlgolia } from "../types";
import { formatHitUrl } from "../utils";

import { useState, useEffect } from "react";
import algoliasearch from "algoliasearch/lite";
import { Toast, showToast } from "@raycast/api";

export function useAlgolia(query = "", currentAPI: TAlgolia) {
  const searchClient = algoliasearch(currentAPI.appId, currentAPI.apiKey);
  const searchIndex = searchClient.initIndex(currentAPI.indexName);

  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    searchIndex
      .search(query, currentAPI.searchParameters)
      .then((res: any) => {
        setIsLoading(false);
        formatHitUrl(res, currentAPI.homepage);

        setSearchResults(res.hits);
      })
      .catch((err: { message: string | undefined }) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Algolia Error", err.message);

        return [];
      });
  }, [query]);

  return { searchResults, isLoading };
}
