import { useState, useEffect, useCallback } from "react";
import * as cheerio from "cheerio";

type SecurityResult =
  | {
      type: "single";
      isin: string;
      companyName: string;
    }
  | {
      type: "multiple";
      results: Map<string, string>; // ISIN -> Company Name
    };

/**
 * Custom hook for debouncing values
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Universal hook to fetch security information from Tradegate with debounce
 * @param {string} query - ISIN or search term
 * @param {number} debounceMs - Debounce time in milliseconds
 * @returns {object} - { data, loading, error }
 */
const useTradegateSecurities = (query: string | null, debounceMs: number = 500) => {
  const [data, setData] = useState<SecurityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use our custom debounce hook
  const debouncedQuery = useDebounce(query, debounceMs);

  // The actual fetch function
  const fetchData = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      // Use the search endpoint for all queries
      const response = await fetch(`https://www.tradegate.de/kurssuche.php?suche=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      try {
        // First try to parse as search results
        const resultRows = $(
          "#main table.full.fixed.grid tbody tr.kurssuche_ergebnis, #main table.full.fixed.grid tbody tr.alt.kurssuche_ergebnis",
        ).slice(0, 10);

        if (resultRows.length) {
          // We have search results
          const searchResults = new Map<string, string>();

          resultRows.each((_, row) => {
            const companyNameElement = $(row).find("td:first-child a");
            const isinElement = $(row).find("td:nth-child(2)");

            if (companyNameElement.length && isinElement.length) {
              const companyName = companyNameElement.text().trim();
              const isin = isinElement.text().trim();
              searchResults.set(isin, companyName);
            }
          });

          setData({
            type: "multiple",
            results: searchResults,
          });

          return;
        }

        // If we're here, we don't have search results
        // Try to parse as a single security page
        const mainH2 = $("#main h2").first();

        if (mainH2.length && !mainH2.text().includes("Kurssuche")) {
          // This looks like a direct security page
          const companyName = mainH2.text().trim();

          // Try to find the ISIN in the page
          const isinElement = $("table.full.grid td")
            .filter(function () {
              return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test($(this).text().trim());
            })
            .first();

          const isin = isinElement.length ? isinElement.text().trim() : searchQuery;

          setData({
            type: "single",
            isin,
            companyName,
          });

          return;
        }

        // If we're here, we couldn't parse the response
        throw new Error("Could not parse the response from Tradegate");
      } catch {
        // If parsing fails, report the error
        throw new Error("Could not extract security information from the response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch security information");
    } finally {
      setLoading(false);
    }
  }, []);

  // Execute the fetch when the debounced query changes
  useEffect(() => {
    // Reset state when debounced query changes
    setData(null);

    // Don't fetch if debounced query is not provided
    if (!debouncedQuery) {
      return;
    }

    fetchData(debouncedQuery);
  }, [debouncedQuery, fetchData]);

  return {
    data,
    loading: loading || (query !== null && query !== debouncedQuery),
    error,
  };
};

export default useTradegateSecurities;
