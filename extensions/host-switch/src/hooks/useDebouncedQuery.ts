import { useState, useRef } from "react";

export function useDebouncedQuery() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  const setQueryFilter = (q: string) => {
    setQuery(q);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setFilter(q), 300);
  };

  return {
    query,
    filter,
    setQuery: setQueryFilter,
  };
}
