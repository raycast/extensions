import { useEffect, useState } from "react";
import { AppItem, parseReadmeContent } from "../utils/parseReadme";

export function useAppSearch() {
  const [searchResults, setSearchResults] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allApps, setAllApps] = useState<AppItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load apps from README
  useEffect(() => {
    try {
      const apps = parseReadmeContent();
      setAllApps(apps);
      setSearchResults(apps);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to load apps data");
      setIsLoading(false);
      console.error(err);
    }
  }, []);

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