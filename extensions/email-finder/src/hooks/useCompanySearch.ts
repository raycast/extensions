import { useState, useEffect } from "react";
import { searchCompanyByName, type CompanySearchResult } from "../api/clearout-client";

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
          setResults([]);
          setError("Failed to search companies. Please try again.");
          setIsLoading(false);
          console.error("Company search failed:", err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return { results, isLoading, error };
}
