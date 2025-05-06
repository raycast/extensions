import { useState, useCallback, useRef, useEffect } from "react";
import { getInsights } from "../api/client";
import { Insight } from "../types/dovetail";
import { useAuth } from "./useAuth";

export function useInsightsSearch() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    const { insights } = await getInsights(searchQuery, undefined, token ?? undefined);
    setData(insights);
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