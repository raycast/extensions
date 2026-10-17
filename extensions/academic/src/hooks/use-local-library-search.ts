import { useEffect, useState } from "react";
import { searchLocalIndex } from "../local-library/indexer";
import type { WorkResult } from "../types";

export function useLocalLibrarySearch(query: string): WorkResult[] {
  const [results, setResults] = useState<WorkResult[]>([]);
  useEffect(() => {
    let disposed = false;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchLocalIndex(trimmed).then((items) => {
        if (!disposed) setResults(items);
      });
    }, 80);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [query]);
  return results;
}
