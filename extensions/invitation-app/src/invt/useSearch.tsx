import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

import fetch from "node-fetch";

// Export the hook
export function useSearch() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");



  // Function to map JSON response to a simplified list item format
function mapToListItems(data) {
  return data.map(item => ({
    title: item.name || item.slug || '???',
    category: item.category,
    domain: item.domain,
    icon: item.iconSquareDefault,
    summary: item.productSummary,
    reward: item.rewardSummary,
    theyGet: item.theyGet,
    youGet: item.youGet,
    url: item.urlAbsolute,
  }));
}


  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    async function fetchResults() {
      if (!searchTerm.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }
    
      try {
        setIsLoading(true);
        setError(null);
    
        //save as autocomplete on web
        const response = await fetch(
          `https://api.invitation.codes/api/v2/referralPrograms/byTextSearch/${encodeURIComponent(
            searchTerm
          )}?limit=10&nameOnly=true`,
          {
            method: "GET",
            headers: {
              "x-client-key": "webfrontend-dev-JA9zovLgJi",
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          }
        );
    
        if (!response.ok) {
          throw new Error(`Search failed with status: ${response.status}`);
        }
    
        const data = await response.json();
         // Map the response data to the simplified structure
    const listItems = data ;// mapToListItems(data);

        console.log('data:::', data);
        console.log('listItems', listItems)
    
        if (!isCancelled) {
          setResults(listItems);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled && err.name !== "AbortError") {
          setError(err.message);
          showToast({
            style: Toast.Style.Failure,
            title: "Search Error",
            message: err.message,
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    const timeoutId = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm]);

  const search = (term: string) => {
    setSearchTerm(term);
  };

  return {
    isLoading,
    results,
    search,
    error,
    searchTerm,
  };
}