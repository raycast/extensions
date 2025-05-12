import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "./useAuth";

type FetchFunction<T> = (query: string, token?: string) => Promise<{ data: T[] }>;

export function useSearch<T>(fetchFunction: FetchFunction<T>) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      try {
        const result = await fetchFunction(searchQuery, token ?? undefined);
        setData(result.data);
      } catch (error) {
        console.error("Search error:", error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    },
    [token, fetchFunction],
  );

  useEffect(() => {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    fetchData(query);
    return () => cancelRef.current?.abort();
  }, [query, fetchData]);

  const onSearchTextChange = useCallback((text: string) => {
    setQuery(text);
    setData([]);
  }, []);

  const numberOfResults = data.length === 1 ? "1 result" : `${data.length} results`;

  return { data, isLoading, onSearchTextChange, numberOfResults };
}
