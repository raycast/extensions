import { useEffect, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { AppItem, fetchReadmeContent } from "../utils/parseReadme";

function useReadmeContent() {
  // Use a stable reference for the fetch function to prevent unnecessary cache invalidation
  const fetchFunction = async () => {
    return fetchReadmeContent();
  };

  // Pass an empty dependency array to ensure the cache is stable
  return useCachedPromise(fetchFunction, [], {
    // Set a reasonable cache time (12 hours in milliseconds)
    keepPreviousData: true,
    initialData: [],
  });
}

export function useAppSearch() {
  const [searchResults, setSearchResults] = useState<AppItem[]>([]);
  const [searchText, setSearchText] = useState("");

  const { data: allApps = [], isLoading, error } = useReadmeContent();

  // Filter apps based on search text
  useEffect(() => {
    // Only update search results when allApps or searchText changes
    if (!searchText) {
      setSearchResults(allApps);
      return;
    }

    const lowerSearchText = searchText.toLowerCase();
    const filtered = allApps.filter((app) => {
      return (
        app.name.toLowerCase().includes(lowerSearchText) ||
        app.description.toLowerCase().includes(lowerSearchText) ||
        app.category.toLowerCase().includes(lowerSearchText)
      );
    });

    setSearchResults(filtered);
  }, [searchText, allApps]); // Keep these dependencies

  return {
    searchResults,
    isLoading,
    error,
    searchText,
    setSearchText,
  };
}
