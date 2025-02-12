/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatHitUrl } from "../utils";

import { useState, useEffect } from "react";
import algoliasearch from "algoliasearch/lite";
import { Toast, showToast } from "@raycast/api";
import { Algolia } from "../data/apis";

const DEFUALT_PARAMETERS = {
  highlightPreTag: "**",
  highlightPostTag: "**",
};

export function useAlgolia(query = "", currentAPI: Algolia) {
  const searchClient = algoliasearch(currentAPI.appId, currentAPI.apiKey);
  const searchIndex = searchClient.initIndex(currentAPI.indexName);

  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let flag = true;
    setIsLoading(true);

    searchIndex
      .search(query, {
        ...DEFUALT_PARAMETERS,
        ...currentAPI.searchParameters,
      })
      .then((res: any) => {
        setIsLoading(false);

        if (!flag) return;

        formatHitUrl(res, currentAPI.homepage);
        setSearchResults(res.hits);
      })
      .catch((err: { message: string | undefined }) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Algolia Error", err.message);

        return [];
      });

    return () => {
      flag = false;
    };
  }, [query, currentAPI]);

  return { searchResults, isLoading };
}
