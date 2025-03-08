import { useEffect, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { AppItem, fetchReadmeContent } from "../utils/parseReadme";

function useReadmeContent() {
  return useCachedPromise(async () => {
    console.log("fetching readme content");
    return fetchReadmeContent();
  }, []);
}

export function useAppSearch() {
  const [searchResults, setSearchResults] = useState<AppItem[]>([]);
  const [searchText, setSearchText] = useState("");

  const { data: allApps = [], isLoading, error } = useReadmeContent();

  // Filter apps based on search text
  useEffect(() => {
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
  }, [searchText, allApps]);

  return {
    searchResults,
    isLoading,
    error,
    searchText,
    setSearchText,
  };
}
