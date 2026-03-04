import { useState, useEffect } from "react";
import { searchCompanyByName, CompanySearchResult } from "../backend";

interface UseCompanySearchResult {
  results: CompanySearchResult[];
  isLoading: boolean;
  error: string | undefined;
}

export function useCompanySearch(query: string): UseCompanySearchResult {
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    // * Minimum 2 characters before searching
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    searchCompanyByName(query)
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to search");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return { results, isLoading, error };
}
