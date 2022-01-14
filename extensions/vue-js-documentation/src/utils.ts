import { useEffect, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import { preferences } from "./preferences";
import { SearchResult } from "./types";

interface SearchResults {
  hits: SearchResult[];
}

export const algoliaClient = algoliasearch(preferences.applicationId, preferences.apiKey);

export function useAlgoliaSearch(
  index: string,
  query: string | undefined
): {
  searchResults?: SearchResults;
  error?: string;
  isLoading: boolean;
} {
  const [searchResults, setSearchResults] = useState<SearchResults>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;
  let hasError = false;

  useEffect(() => {
    async function fetchData() {
      if (cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const response = await algoliaClient
          .initIndex(index)
          .search(query ? query : "", {
            facetFilters: [index === "vuejs" ? "version:v2" : ""],
            hitsPerPage: 50,
          })
          .then((res) => {
            hasError = false;
            return res;
          })
          .catch((err) => {
            hasError = true;
            return err;
          });

        if (hasError) {
          setError(response.message);
          return;
        }

        if (!cancel) {
          setSearchResults(response as SearchResults);
        }
      } catch (e) {
        if (!cancel) {
          setError(String(e));
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [index, query]);

  return { searchResults, error, isLoading };
}
