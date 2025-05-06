import { useState, useCallback, useRef, useEffect } from "react";
import { getData } from "../api/client";
import { Data } from "../types/dovetail";
import { useAuth } from "./useAuth";

export function useDataSearch() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Data[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    const { data } = await getData(searchQuery, token ?? undefined);
    setData(data);
    setIsLoading(false);
  }, [token]);

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