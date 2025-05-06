import { useState, useCallback, useRef, useEffect } from "react";
import { getContacts } from "../api/client";
import { Contact } from "../types/dovetail";
import { useAuth } from "./useAuth";

export function useContactsSearch() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Contact[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (searchQuery: string, after?: string | null) => {
    setIsLoading(true);
    const { contacts } = await getContacts(searchQuery, after, token ?? undefined);
    setData(contacts.map((c) => ({ ...c, name: c.name ?? "" })));
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
    setEndCursor(null);
  }, []);

  const onLoadMore = useCallback(() => {
    if (hasMore) fetchData(query, endCursor);
  }, [hasMore, endCursor, query, fetchData]);

  const numberOfResults = data.length === 1 ? "1 result" : `${data.length} results`;

  return { data, isLoading, onSearchTextChange, onLoadMore, hasMore, numberOfResults };
} 