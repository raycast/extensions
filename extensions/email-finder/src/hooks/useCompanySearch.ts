import { useState, useEffect } from "react";
import { searchCompanyByName, CompanySearchResult } from "../backend";

interface UseCompanySearchResult {
  results: CompanySearchResult[];
  isLoading: boolean;
}

export function useCompanySearch(query: string): UseCompanySearchResult {
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    searchCompanyByName(query)
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return { results, isLoading };
}
