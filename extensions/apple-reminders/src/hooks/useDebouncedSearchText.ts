import { useEffect, useState } from "react";

export function useDebouncedSearchText(searchText: string) {
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchText(searchText), 300);
    return () => clearTimeout(timeout);
  }, [searchText]);

  return { debouncedSearchText, isSearchPending: searchText !== debouncedSearchText };
}
