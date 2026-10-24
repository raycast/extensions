import { Cache } from "@raycast/api";
import { useState } from "react";
import { getCachedDocumentation } from "./wpilib-documentation-cache";

interface UseWpilibDocumentationOptions<T> {
  cache: Cache;
  cacheKey: string;
  searchTextKey: string;
  getDocumentation: () => Promise<T[] | undefined>;
}

export function useWpilibDocumentation<T>({
  cache,
  cacheKey,
  searchTextKey,
  getDocumentation,
}: UseWpilibDocumentationOptions<T>) {
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<T[] | null>(() => getCachedDocumentation<T[]>(cache, cacheKey));

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    cache.set(searchTextKey, text);
  };

  const fetchDocumentation = async () => {
    if (loading) return;

    setLoading(true);

    const docs = await getDocumentation();

    cache.set(cacheKey, JSON.stringify(docs ?? []));
    setData(docs ?? []);
    setLoading(false);
    setSearchText("");
  };

  return {
    searchText,
    loading,
    data,
    handleSearchChange,
    fetchDocumentation,
  };
}
